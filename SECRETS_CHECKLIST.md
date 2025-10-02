# ✅ GitHub Secrets 配置检查清单

## 📋 配置步骤速查

### 1️⃣ 进入 GitHub Secrets 设置
```
GitHub 仓库 → Settings → Secrets and variables → Actions → New repository secret
```

### 2️⃣ 添加以下 8 个 Secrets

#### 🖥️ 服务器连接配置

- [ ] **SERVER_HOST**
  ```
  名称: SERVER_HOST
  值: 你的服务器IP或域名
  示例: 123.45.67.89
  ```

- [ ] **SERVER_USERNAME**
  ```
  名称: SERVER_USERNAME
  值: SSH用户名
  示例: root 或 ubuntu
  ```

- [ ] **SERVER_SSH_KEY**
  ```
  名称: SERVER_SSH_KEY
  值: 完整的SSH私钥内容
  ```
  
  **获取方式**:
  ```bash
  # 1. 在你的电脑上生成密钥对
  ssh-keygen -t rsa -b 4096 -C "github-deploy"
  
  # 2. 将公钥复制到服务器
  ssh-copy-id -i ~/.ssh/id_rsa.pub username@server_ip
  
  # 3. 复制私钥内容到 GitHub
  cat ~/.ssh/id_rsa
  # 完整复制输出内容，包括:
  # -----BEGIN OPENSSH PRIVATE KEY-----
  # ... 中间的所有行 ...
  # -----END OPENSSH PRIVATE KEY-----
  ```

- [ ] **SERVER_PORT** (可选，默认22)
  ```
  名称: SERVER_PORT
  值: 22
  ```

- [ ] **SERVER_PATH**
  ```
  名称: SERVER_PATH
  值: /var/www/wok-panel
  ```

#### 🔐 应用环境变量

- [ ] **VITE_AG_GRID_LICENSE_KEY**
  ```
  名称: VITE_AG_GRID_LICENSE_KEY
  值: 你的AG Grid许可证密钥
  获取: https://www.ag-grid.com/
  ```

- [ ] **VITE_API_ACCESS_TOKEN**
  ```
  名称: VITE_API_ACCESS_TOKEN
  值: sk-开头的API令牌
  获取: 从后端 config.yml 的 api.auth.api-token 复制
  ```

- [ ] **VITE_API_BASE_URL**
  ```
  名称: VITE_API_BASE_URL
  值: https://api.mcwok.cn/api/v1
  注意: 替换为你的实际API地址
  ```

---

## 🚀 快速测试部署

配置完成后:

1. 进入 GitHub 仓库的 **Actions** 标签
2. 选择 **Deploy to Web Server** 工作流
3. 点击 **Run workflow**
4. 选择 `main` 分支
5. 点击 **Run workflow** 开始部署

---

## 🔍 常见问题快速解决

### ❌ SSH 连接失败
```bash
# 测试 SSH 连接
ssh -i ~/.ssh/id_rsa username@server_ip

# 如果失败，检查:
# 1. 服务器 IP 是否正确
# 2. SSH 端口是否开放
# 3. 公钥是否已添加到服务器
```

### ❌ 权限错误
```bash
# 在服务器上检查授权密钥
cat ~/.ssh/authorized_keys

# 确保部署目录存在且有权限
sudo mkdir -p /var/www/wok-panel
sudo chown -R www-data:www-data /var/www/wok-panel
```

### ❌ 构建失败
- 检查所有 VITE_ 开头的环境变量是否设置
- 确认 AG Grid 许可证密钥有效
- 检查 API Token 是否正确

---

## 📸 配置截图参考

### 添加 Secret 的界面应该是这样的:

```
┌─────────────────────────────────────────┐
│ New secret                              │
├─────────────────────────────────────────┤
│ Name *                                  │
│ ┌─────────────────────────────────────┐ │
│ │ SERVER_HOST                         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Secret *                                │
│ ┌─────────────────────────────────────┐ │
│ │ 123.45.67.89                        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Add secret]                            │
└─────────────────────────────────────────┘
```

重复 8 次，每次添加一个不同的 Secret。

---

## ✨ 配置完成后

所有 Secrets 添加完成后，你应该能看到:

```
Secrets (8)
├─ SERVER_HOST
├─ SERVER_USERNAME  
├─ SERVER_SSH_KEY
├─ SERVER_PORT
├─ SERVER_PATH
├─ VITE_AG_GRID_LICENSE_KEY
├─ VITE_API_ACCESS_TOKEN
└─ VITE_API_BASE_URL
```

现在可以开始部署了！🎉

---

**提示**: 如果不确定某个值，可以先使用测试值，部署失败后再根据错误信息调整。
