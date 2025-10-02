# 🚀 自动化部署指南

## 📋 概述

本项目使用 GitHub Actions 实现自动化部署到服务器。工作流文件位于 `.github/workflows/deploy-to-server.yml`。

---

## 🔧 配置步骤

### 1. 配置 GitHub Secrets

在 GitHub 仓库中设置以下 Secrets：

#### 访问 Secrets 设置
1. 进入 GitHub 仓库页面
2. 点击 **Settings** (设置)
3. 在左侧菜单找到 **Secrets and variables** → **Actions**
4. 点击 **New repository secret** 添加密钥

---

### 2. 必需的 Secrets

#### 🔑 服务器连接配置

##### `SERVER_HOST`
- **描述**: 服务器 IP 地址或域名
- **示例**: `123.45.67.89` 或 `server.example.com`
- **获取方式**: 从服务器提供商或系统管理员获取

##### `SERVER_USERNAME`
- **描述**: SSH 登录用户名
- **示例**: `root` 或 `ubuntu` 或 `deploy`
- **获取方式**: 服务器的 SSH 用户名

##### `SERVER_SSH_KEY`
- **描述**: SSH 私钥（用于免密登录）
- **格式**: 完整的 SSH 私钥内容，包括开头和结尾标记
- **获取方式**: 
  ```bash
  # 在服务器上生成 SSH 密钥对（如果还没有）
  ssh-keygen -t rsa -b 4096 -C "github-actions-deploy"
  
  # 将公钥添加到服务器的授权密钥列表
  cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
  
  # 复制私钥内容到 GitHub Secrets
  cat ~/.ssh/id_rsa
  ```
- **示例格式**:
  ```
  -----BEGIN OPENSSH PRIVATE KEY-----
  b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdzc2gtcn
  ... (中间省略很多行)
  -----END OPENSSH PRIVATE KEY-----
  ```

##### `SERVER_PORT` (可选)
- **描述**: SSH 端口号
- **默认值**: `22`
- **示例**: `22` 或 `2222` (如果服务器使用非标准端口)

##### `SERVER_PATH`
- **描述**: 网站部署的目标路径
- **示例**: `/var/www/wok-panel` 或 `/home/www/public_html`
- **注意**: 
  - 确保该路径存在
  - 确保 SSH 用户有写入权限
  - 通常对应 Nginx 配置中的 `root` 路径

---

#### 🔐 环境变量 (Vue 构建时使用)

##### `VITE_AG_GRID_LICENSE_KEY`
- **描述**: AG Grid 企业版许可证密钥
- **获取方式**: 从 AG Grid 官网购买或试用
- **示例**: `CompanyName_YOUR_LICENSE_KEY_HERE_123456789`
- **是否必需**: 是（如果使用 AG Grid 企业版功能）

##### `VITE_API_ACCESS_TOKEN`
- **描述**: 后端 API 访问令牌
- **获取方式**: 
  - 从后端 `config.yml` 中的 `api.auth.api-token` 字段复制
  - 格式: `sk-` 开头的 64 位字符串
- **示例**: `sk-J6WX2lVeMiJB9a4veklDVGNUe0brItoYt43tzaJtlQMKE41s9iidBkJlamfxL`
- **是否必需**: 是（用于 API 认证）

##### `VITE_API_BASE_URL`
- **描述**: 后端 API 基础 URL
- **示例**: `https://api.mcwok.cn/api/v1`
- **是否必需**: 是（生产环境）
- **注意**: 不要包含末尾的斜杠 `/`

---

## 📝 Secrets 配置清单

| Secret 名称 | 是否必需 | 示例值 | 说明 |
|------------|---------|--------|------|
| `SERVER_HOST` | ✅ 必需 | `123.45.67.89` | 服务器地址 |
| `SERVER_USERNAME` | ✅ 必需 | `root` | SSH 用户名 |
| `SERVER_SSH_KEY` | ✅ 必需 | `-----BEGIN OPENSSH...` | SSH 私钥 |
| `SERVER_PORT` | ⚪ 可选 | `22` | SSH 端口（默认22） |
| `SERVER_PATH` | ✅ 必需 | `/var/www/wok-panel` | 部署路径 |
| `VITE_AG_GRID_LICENSE_KEY` | ✅ 必需 | `CompanyName_KEY...` | AG Grid 许可证 |
| `VITE_API_ACCESS_TOKEN` | ✅ 必需 | `sk-J6WX2lVe...` | API 访问令牌 |
| `VITE_API_BASE_URL` | ✅ 必需 | `https://api.mcwok.cn/api/v1` | API 地址 |

---

## 🚀 使用方法

### 手动触发部署

1. 进入 GitHub 仓库页面
2. 点击顶部的 **Actions** 标签
3. 在左侧选择 **Deploy to Web Server** 工作流
4. 点击右侧的 **Run workflow** 按钮
5. 选择分支（默认 `main`）
6. 点击绿色的 **Run workflow** 按钮确认

### 自动触发部署（可选）

如果希望推送代码时自动部署，编辑 `.github/workflows/deploy-to-server.yml`：

```yaml
on:
  workflow_dispatch:  # 保留手动触发
  push:              # 添加自动触发
    branches:
      - main
```

---

## 🔍 部署流程

工作流会执行以下步骤：

1. **📥 检出代码**: 从 GitHub 拉取最新代码
2. **⚙️ 安装环境**: 安装 Node.js 20 和 pnpm 8
3. **📦 安装依赖**: 运行 `pnpm install`
4. **🏗️ 构建项目**: 运行 `pnpm run build`，注入环境变量
5. **💾 备份旧版**: 将服务器现有网站备份到 `/var/backups/wok-web/`
6. **🗑️ 清空目录**: 清空部署目录
7. **📤 上传文件**: 通过 SCP 上传构建产物到服务器
8. **🔐 设置权限**: 修改文件所有者和权限
9. **🔄 重载 Nginx**: 重新加载 Nginx 配置
10. **✅ 验证部署**: 检查文件是否正确部署

---

## 📊 部署后检查

### 查看部署日志
1. 进入 **Actions** 标签
2. 点击最近的工作流运行记录
3. 查看各步骤的详细日志

### 访问网站
部署成功后，访问你的域名：
- 🌐 **生产环境**: https://panel.mcwok.cn (替换为你的域名)

### SSH 登录服务器检查
```bash
# 连接到服务器
ssh username@server_host

# 检查文件
ls -lah /var/www/wok-panel

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 检查 Nginx 状态
sudo systemctl status nginx
```

---

## 🛠️ 服务器准备工作

### 1. 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# 启动 Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2. 配置 Nginx

创建网站配置文件 `/etc/nginx/sites-available/wok-panel`:

```nginx
server {
    listen 80;
    server_name panel.mcwok.cn;  # 替换为你的域名
    
    root /var/www/wok-panel;
    index index.html;
    
    # Vue Router History 模式支持
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 禁止访问隐藏文件
    location ~ /\. {
        deny all;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/wok-panel /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. 配置 HTTPS (可选但推荐)

使用 Let's Encrypt 免费 SSL 证书：

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 自动配置 SSL
sudo certbot --nginx -d panel.mcwok.cn

# 自动续期（Certbot 会自动设置定时任务）
sudo certbot renew --dry-run
```

### 4. 创建部署目录

```bash
sudo mkdir -p /var/www/wok-panel
sudo chown -R www-data:www-data /var/www/wok-panel
```

---

## ⚠️ 故障排查

### 问题1: SSH 连接失败
```
Error: dial tcp: lookup server.example.com: no such host
```

**解决方案**:
- 检查 `SERVER_HOST` 是否正确
- 检查服务器是否在线
- 检查防火墙是否开放 SSH 端口

### 问题2: 权限被拒绝
```
Permission denied (publickey)
```

**解决方案**:
- 确认 SSH 私钥格式正确（包含开头和结尾标记）
- 检查服务器上的公钥是否在 `~/.ssh/authorized_keys` 中
- 确认 SSH 用户名正确

### 问题3: 构建失败
```
Error: Cannot find module 'ag-grid-enterprise'
```

**解决方案**:
- 检查 `VITE_AG_GRID_LICENSE_KEY` 是否正确设置
- 确认所有依赖都在 `package.json` 中

### 问题4: API 连接失败

**解决方案**:
- 检查 `VITE_API_BASE_URL` 是否正确
- 检查 `VITE_API_ACCESS_TOKEN` 是否有效
- 确认后端 API 服务正在运行

---

## 🔒 安全建议

1. **SSH 密钥安全**:
   - 使用专用的部署密钥，不要使用个人 SSH 密钥
   - 定期轮换密钥
   - 限制密钥的访问权限

2. **服务器安全**:
   - 使用非 root 用户进行部署
   - 配置防火墙只开放必要端口
   - 启用 fail2ban 防止暴力破解

3. **Secrets 管理**:
   - 永远不要在代码中硬编码密钥
   - 不要在公开场合分享 Secrets
   - 定期检查和更新 API Token

---

## 📚 相关资源

- [GitHub Actions 文档](https://docs.github.com/actions)
- [GitHub Secrets 管理](https://docs.github.com/actions/security-guides/encrypted-secrets)
- [Nginx 配置指南](https://nginx.org/en/docs/)
- [Let's Encrypt SSL 证书](https://letsencrypt.org/)

---

## 📞 获取帮助

如果遇到问题：

1. 查看 GitHub Actions 运行日志
2. 检查 Nginx 错误日志: `sudo tail -f /var/log/nginx/error.log`
3. 查阅本文档的故障排查部分
4. 联系系统管理员

---

**最后更新**: 2025年10月3日  
**适用版本**: World-of-Kivotos_Web v1.0.0+
