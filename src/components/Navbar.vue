<template>
  <nav class="navbar">
    <div class="navbar-container">
      <!-- 左侧 Logo 和标题 -->
      <div class="navbar-brand">
        <a href="/" class="brand-link">
          <span class="brand-text">World of Kivotos</span>
        </a>
      </div>

      <!-- 右侧导航链接 -->
      <div class="navbar-nav">
        <div class="nav-links">
          <a href="/" class="nav-link">官网</a>
          <a href="/" class="nav-link">首页</a>
        </div>
        
        <!-- 分隔线 -->
        <div class="nav-divider"></div>
        
        <!-- GitHub 图标 -->
        <div class="nav-social">
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer"
            class="social-link"
            aria-label="GitHub"
          >
            <svg class="github-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
</script>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  height: 60px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.25s ease;
}

.navbar-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
}

.navbar-brand {
  display: flex;
  align-items: center;
}

.brand-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: inherit;
  transition: opacity 0.25s ease;
}

.brand-link:hover {
  opacity: 0.8;
}

.brand-text {
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: -0.02em;
}

.navbar-nav {
  display: flex;
  align-items: center;
  gap: 16px;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 24px;
}

.nav-link {
  position: relative;
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: color 0.25s ease;
  padding: 8px 0;
}

.nav-link:hover {
  color: rgba(255, 255, 255, 0.9);
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.6);
  transform: scaleX(0);
  transition: transform 0.25s ease;
}

.nav-link:hover::after {
  transform: scaleX(1);
}

.nav-divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.2);
  margin: 0 8px;
}

.nav-social {
  display: flex;
  align-items: center;
}

.social-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.25s ease;
}

.social-link:hover {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.1);
}

.github-icon {
  width: 20px;
  height: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .navbar-container {
    padding: 0 16px;
  }
  
  .nav-links {
    gap: 16px;
  }
  
  .nav-link {
    font-size: 13px;
  }
  
  .brand-text {
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .nav-links {
    display: none;
  }
  
  .nav-divider {
    display: none;
  }
}

/* 暗色主题适配（如果需要的话） */
@media (prefers-color-scheme: dark) {
  .navbar {
    background: rgba(255, 255, 255, 0.1);
    border-bottom-color: rgba(255, 255, 255, 0.2);
  }
  
  .brand-text {
    color: rgba(255, 255, 255, 0.9);
  }
  
  .nav-link {
    color: rgba(255, 255, 255, 0.7);
  }
  
  .nav-link:hover {
    color: rgba(255, 255, 255, 0.9);
  }
  
  .nav-link::after {
    background: rgba(255, 255, 255, 0.6);
  }
  
  .nav-divider {
    background: rgba(255, 255, 255, 0.2);
  }
  
  .social-link {
    color: rgba(255, 255, 255, 0.7);
  }
  
  .social-link:hover {
    color: rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.1);
  }
}
</style>