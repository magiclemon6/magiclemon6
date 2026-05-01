
    // ======================= 配置区 =======================
    // 在这里添加你要监控的服务器，支持 Java版 & 基岩版 (API会自动识别)
    // 格式: { host: "服务器IP或域名:端口", name: "显示名称", showPlayerList: true/false 可选, 默认 true }
    const SERVERS_CONFIG = [
        { host: "109.244.32.211:18356", name: "一号服", showPlayerList: true },
        { host: "109.244.32.211:17173", name: "二号服", showPlayerList: true }   // 请换成你自己的服务器
    ];
    // 刷新间隔（毫秒）
    const REFRESH_INTERVAL_MS = 30000;   // 30秒

    // ========== 辅助函数：防XSS ==========
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    // ========== 创建空卡片骨架（加载状态） ==========
    function createCardSkeleton(serverConfig, index) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        cardDiv.setAttribute('data-server-index', index);
        cardDiv.setAttribute('data-server-host', serverConfig.host);
        
        // 内部的占位结构
        cardDiv.innerHTML = `
            <div class="card-header">
                <span class="server-name">${escapeHtml(serverConfig.name)}</span>
                <span class="status-badge">加载中...</span>
            </div>
            <div class="player-count">
                👥 <span class="players-online-text">--</span> <small>/ <span class="players-max-text">--</span></small>
            </div>
            <div class="motd loading-skeleton">
                📡 获取服务器状态...
            </div>
            <div class="player-list-section" style="display: ${serverConfig.showPlayerList !== false ? 'block' : 'none'}">
                <div class="player-list-header">
                    🧑‍🤝‍🧑 在线玩家 <span class="player-count-note"></span>
                </div>
                <ul class="player-list">
                    <li>等待数据</li>
                </ul>
            </div>
            <div class="footer-note">
                🕒 更新中
            </div>
        `;
        return cardDiv;
    }

    // ========== 更新单个卡片的数据 ==========
    async function updateSingleCard(cardElement, serverConfig, index) {
        const host = serverConfig.host;
        const apiUrl = `https://api.mcsrvstat.us/3/${host}`;
        const showPlayerList = serverConfig.showPlayerList !== false;
        
        // 获取需要更新的DOM元素
        const statusBadge = cardElement.querySelector('.status-badge');
        const playersOnlineSpan = cardElement.querySelector('.players-online-text');
        const playersMaxSpan = cardElement.querySelector('.players-max-text');
        const motdDiv = cardElement.querySelector('.motd');
        const playerListSection = cardElement.querySelector('.player-list-section');
        const playerListUl = cardElement.querySelector('.player-list');
        const playerCountNote = cardElement.querySelector('.player-count-note');
        const footerNote = cardElement.querySelector('.footer-note');
        
        // 显示刷新提示
        if (footerNote) footerNote.innerHTML = '🔄 刷新中...';
        
        try {
            // 超时控制 (5秒)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            const response = await fetch(apiUrl, {
                signal: controller.signal,
                headers: { 'User-Agent': 'MCServerMultiViewer/1.0 (contact@example.com)' }
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            
            // 检查在线状态
            if (!data.online) throw new Error('服务器离线');
            
            // 1. 状态徽章 -> 在线
            statusBadge.innerText = '在线';
            statusBadge.className = 'status-badge online';
            
            // 2. 玩家数量
            const online = data.players?.online ?? 0;
            const max = data.players?.max ?? '?';
            playersOnlineSpan.innerText = online;
            playersMaxSpan.innerText = max;
            
            // 3. MOTD 处理
            if (data.motd?.clean && data.motd.clean.length > 0) {
                motdDiv.innerHTML = data.motd.clean.map(line => escapeHtml(line)).join('<br>');
            } else {
                motdDiv.innerHTML = '✨ 欢迎来到服务器 ✨';
            }
            motdDiv.classList.remove('loading-skeleton');
            
            // 4. 玩家列表部分（如果配置开启且API提供了list）
            if (showPlayerList && playerListSection) {
                if (data.players?.list && data.players.list.length > 0) {
                    const players = data.players.list;
                    const playerNames = players.map(p => typeof p === 'string' ? p : p.name).filter(n => n);
                    if (playerCountNote) playerCountNote.innerText = `(${playerNames.length})`;
                    if (playerListUl) {
                        playerListUl.innerHTML = playerNames.map(name => `<li>${escapeHtml(name)}</li>`).join('');
                    }
                } else {
                    if (playerCountNote) playerCountNote.innerText = `(0)`;
                    if (playerListUl) playerListUl.innerHTML = '<li>暂无在线玩家或未开启查询协议</li>';
                }
            } else if (!showPlayerList && playerListSection) {
                // 如果配置隐藏玩家列表区块，清空内容更好
                if (playerListUl) playerListUl.innerHTML = '<li>未展示玩家列表</li>';
            }
            
            // 脚注更新时间
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
            if (footerNote) footerNote.innerHTML = `✅ 更新于 ${timeStr} | 缓存2分钟`;
            
        } catch (error) {
            console.error(`[${host}] 获取失败:`, error);
            // 离线样式
            statusBadge.innerText = '离线';
            statusBadge.className = 'status-badge offline';
            playersOnlineSpan.innerText = '❌';
            playersMaxSpan.innerText = '?';
            motdDiv.innerHTML = '🔌 无法连接服务器<br>请检查地址或服务器状态';
            motdDiv.classList.remove('loading-skeleton');
            
            if (showPlayerList && playerListSection) {
                if (playerCountNote) playerCountNote.innerText = `(0)`;
                if (playerListUl) playerListUl.innerHTML = '<li>服务器离线</li>';
            }
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
            if (footerNote) footerNote.innerHTML = `⚠️ 离线 | ${timeStr}`;
        }
    }

    // ========== 初始化所有卡片，并启动定时更新 ==========
    function initMultiServerDashboard(servers) {
        const gridContainer = document.getElementById('serversGrid');
        if (!gridContainer) return;
        
        // 清空网格
        gridContainer.innerHTML = '';
        
        // 存储每个卡片对应的计时器ID（可选，便于后续清理）
        const intervalIds = [];
        
        servers.forEach((config, idx) => {
            // 创建卡片DOM
            const card = createCardSkeleton(config, idx);
            gridContainer.appendChild(card);
            
            // 立即执行一次数据拉取
            updateSingleCard(card, config, idx);
            
            // 设置定时刷新（每个卡片独立定时器，避免互相干扰）
            const intervalId = setInterval(() => {
                updateSingleCard(card, config, idx);
            }, REFRESH_INTERVAL_MS);
            intervalIds.push(intervalId);
        });
        
        // 可选：页面关闭时清理所有定时器（不是必须，但优雅）
        window.addEventListener('beforeunload', () => {
            intervalIds.forEach(id => clearInterval(id));
        });
    }

    // 页面加载完成后启动
    document.addEventListener('DOMContentLoaded', () => {
        // 过滤掉明显无效的配置（可选）
        const validServers = SERVERS_CONFIG.filter(s => s.host && s.host.trim() !== '');
        if (validServers.length === 0) {
            document.getElementById('serversGrid').innerHTML = '<div class="card" style="grid-column:1/-1; text-align:center;">⚠️ 未配置任何服务器，请在SERVERS_CONFIG中添加服务器地址。</div>';
            return;
        }
        initMultiServerDashboard(validServers);
    });
