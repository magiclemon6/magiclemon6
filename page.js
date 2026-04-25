// 页面切换功能
        document.querySelectorAll('.navbtn a').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                // 获取目标页面ID
                const pageId = this.getAttribute('data-page');
                
                // 隐藏所有页面
                document.querySelectorAll('.page').forEach(page => {
                    page.classList.remove('active');
                });
                
                // 显示目标页面
                document.getElementById(pageId).classList.add('active');
                
                // 更新导航激活状态
                document.querySelectorAll('.navbtn a').forEach(a => {
                    a.classList.remove('active');
                });
                this.classList.add('active');
                
                // 更新浏览器URL（不刷新页面）
                history.pushState(null, null, `#${pageId}`);
            });
        });
        
        // 处理浏览器前进/后退
        window.addEventListener('popstate', function() {
            const hash = window.location.hash.substring(1) || 'home';
            const link = document.querySelector(`.navbtn a[data-page="${hash}"]`);
            if (link) link.click();
        });
        
        // 页面加载时检查hash
        window.addEventListener('DOMContentLoaded', function() {
            const hash = window.location.hash.substring(1);
            if (hash) {
                const link = document.querySelector(`.navbtn a[data-page="${hash}"]`);
                if (link) link.click();
            }
        });