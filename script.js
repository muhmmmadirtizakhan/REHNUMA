class RehnumaChat {
    constructor() {
        this.API_URL = '/api/chat';
        this.chatHistory = [];
        
        // Configure marked for markdown rendering
        marked.setOptions({
            highlight: function(code, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                }
                return hljs.highlightAuto(code).value;
            },
            breaks: true,
            gfm: true
        });

        this.initElements();
        this.initEventListeners();
        this.loadChatHistory();
        this.setupMobileKeyboardHandling();
    }

    initElements() {
        // Main elements
        this.chatBox = document.getElementById('chatBox');
        this.userInput = document.getElementById('userInput');
        this.sendBtn = document.getElementById('sendMessageBtn');
        
        // Hamburger menu
        this.hamburgerBtn = document.getElementById('hamburgerBtn');
        this.mobileMenu = document.getElementById('mobileMenu');
        
        // Menu buttons
        this.downloadBtn = document.getElementById('downloadChatBtn');
        this.resetBtn = document.getElementById('resetChatBtn');
        this.infoBtn = document.getElementById('infoBtn');
        this.closeInfoBtn = document.getElementById('closeInfoBtn');
        this.infoModal = document.getElementById('infoModal');
    }

    initEventListeners() {
        // Send message
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Hamburger menu
        this.hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hamburgerBtn.classList.toggle('active');
            this.mobileMenu.classList.toggle('show');
        });

        // Close menu on outside click
        document.addEventListener('click', (e) => {
            if (!this.hamburgerBtn.contains(e.target) && !this.mobileMenu.contains(e.target)) {
                this.hamburgerBtn.classList.remove('active');
                this.mobileMenu.classList.remove('show');
            }
        });

        // Menu actions
        this.downloadBtn.addEventListener('click', () => this.downloadChat());
        this.resetBtn.addEventListener('click', () => this.resetChat());
        this.infoBtn.addEventListener('click', () => this.showInfo());
        this.closeInfoBtn.addEventListener('click', () => this.hideInfo());

        // Close modal on outside click
        this.infoModal.addEventListener('click', (e) => {
            if (e.target === this.infoModal) this.hideInfo();
        });

        // Handle window resize for mobile
        window.addEventListener('resize', () => {
            this.scrollToBottom();
        });
    }

    setupMobileKeyboardHandling() {
        // Handle mobile keyboard appearing/disappearing
        if ('visualViewport' in window) {
            window.visualViewport.addEventListener('resize', () => {
                if (window.visualViewport.height < window.innerHeight) {
                    // Keyboard is open
                    this.chatBox.style.paddingBottom = '10px';
                    setTimeout(() => this.scrollToBottom(), 100);
                } else {
                    // Keyboard is closed
                    this.chatBox.style.paddingBottom = '25px';
                }
            });
        }

        // Handle input focus for mobile
        this.userInput.addEventListener('focus', () => {
            setTimeout(() => this.scrollToBottom(), 300);
        });
    }

    downloadChat() {
        const messages = this.chatBox.querySelectorAll('.message');
        
        if (messages.length === 0) {
            this.showNotification('No messages to download.');
            return;
        }

        let chatContent = 'REHNUMA CHAT HISTORY\n';
        chatContent += '='.repeat(50) + '\n';
        chatContent += `Generated: ${new Date().toLocaleString()}\n`;
        chatContent += '='.repeat(50) + '\n\n';

        messages.forEach(msg => {
            const isBot = msg.classList.contains('bot-msg');
            const sender = isBot ? 'REHNUMA' : 'YOU';
            const textBubble = msg.querySelector('.text-bubble');
            
            if (textBubble) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = textBubble.innerHTML;
                const text = tempDiv.textContent || tempDiv.innerText || '';
                
                chatContent += `[${sender}]\n`;
                chatContent += `${text.trim()}\n`;
                chatContent += '-'.repeat(40) + '\n\n';
            }
        });

        chatContent += '\n' + '='.repeat(50) + '\n';
        chatContent += `Total messages: ${messages.length}\n`;
        chatContent += `End of chat history\n`;

        const blob = new Blob([chatContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        link.download = `rehnuma-chat-${timestamp}.txt`;
        link.href = url;
        link.click();

        URL.revokeObjectURL(url);

        this.hamburgerBtn.classList.remove('active');
        this.mobileMenu.classList.remove('show');

        this.showNotification('Chat downloaded successfully!');
    }

    showNotification(message) {
        // Remove existing notification if any
        const existingNotification = document.querySelector('.chat-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = 'chat-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #00A3E0;
            color: white;
            padding: 12px 24px;
            border-radius: 50px;
            font-weight: 500;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 2000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;

        // Add animation keyframes if not present
        if (!document.querySelector('#notificationStyles')) {
            const style = document.createElement('style');
            style.id = 'notificationStyles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    async sendMessage() {
        const text = this.userInput.value.trim();
        if (!text) return;

        this.addUserMessage(text);
        this.userInput.value = '';
        this.showTypingIndicator();

        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: text,
                    history: this.chatHistory.slice(-5)
                })
            });

            const data = await response.json();
            
            this.removeTypingIndicator();
            this.addBotMessage(data.response);
            
            this.chatHistory.push({
                user: text,
                bot: data.response,
                timestamp: new Date().toISOString()
            });
            this.saveChatHistory();

        } catch (error) {
            this.removeTypingIndicator();
            this.addBotMessage('**Error:** Sorry, I encountered a connection issue. Please try again.');
            console.error('Chat error:', error);
        }
    }

    addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-msg';
        messageDiv.innerHTML = `
            <div class="text-bubble">${this.escapeHTML(text).replace(/\n/g, '<br>')}</div>
            <div class="avatar"><img src="https://cdn-icons-png.flaticon.com/512/1144/1144760.png" alt="User"></div>
        `;
        this.chatBox.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addBotMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-msg';
        
        const htmlContent = marked.parse(text);
        
        messageDiv.innerHTML = `
            <div class="avatar"><img src="https://cdn-icons-png.flaticon.com/512/4712/4712035.png" alt="Bot"></div>
            <div class="text-bubble markdown-body">${htmlContent}</div>
        `;
        this.chatBox.appendChild(messageDiv);
        
        messageDiv.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
        
        this.scrollToBottom();
    }

    showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'message bot-msg';
        indicator.id = 'typingIndicator';
        indicator.innerHTML = `
            <div class="avatar"><img src="https://cdn-icons-png.flaticon.com/512/4712/4712035.png" alt="Bot"></div>
            <div class="text-bubble">
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        this.chatBox.appendChild(indicator);
        this.scrollToBottom();
    }

    removeTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) indicator.remove();
    }

    resetChat() {
        this.chatBox.innerHTML = '';
        this.chatHistory = [];
        localStorage.removeItem('rehnumaChatHistory');
        
        const welcomeMsg = `✨ Hello! I'm Rehnuma — your premium AI assistant powered by Gemini 2.5 Flash.

**I Support:**
• Full assistant capabilities
• CV writing assistance
• Guide about admissions, opportunities and scholarships
• Markdown formatting
• Code syntax highlighting

How can I help you today?`;
        
        this.addBotMessage(welcomeMsg);
        
        this.hamburgerBtn.classList.remove('active');
        this.mobileMenu.classList.remove('show');
    }

    showInfo() {
        this.infoModal.classList.add('show');
        this.hamburgerBtn.classList.remove('active');
        this.mobileMenu.classList.remove('show');
    }

    hideInfo() {
        this.infoModal.classList.remove('show');
    }

    escapeHTML(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    scrollToBottom() {
        this.chatBox.scrollTo({
            top: this.chatBox.scrollHeight,
            behavior: 'smooth'
        });
    }

    saveChatHistory() {
        try {
            localStorage.setItem('rehnumaChatHistory', JSON.stringify(this.chatHistory));
        } catch (e) {
            console.warn('Could not save chat history:', e);
        }
    }

    loadChatHistory() {
        try {
            const saved = localStorage.getItem('rehnumaChatHistory');
            if (saved) {
                this.chatHistory = JSON.parse(saved);
                if (this.chatHistory.length > 0) {
                    const recent = this.chatHistory.slice(-3);
                    recent.forEach(entry => {
                        if (entry.user) this.addUserMessage(entry.user);
                        if (entry.bot) this.addBotMessage(entry.bot);
                    });
                }
            }
        } catch (e) {
            console.warn('Could not load chat history:', e);
        }
    }
}

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.rehnumaChat = new RehnumaChat();
});

// Keep original sendMessage function for compatibility
function sendMessage() {
    window.rehnumaChat.sendMessage();
}