import { ChatService } from '../services/chat.service.js';
import { SecurityService } from '../services/security.service.js';
import { Utils } from '../utils.js';

export class ChatComponent {
    constructor() {
        this.chatService = new ChatService();
        this.securityService = new SecurityService();
        this.elements = {
            chatContainer: document.getElementById('chatContainer'),
            chatMessages: document.getElementById('chatMessages'),
            chatInput: document.getElementById('chatInput'),
            chatSend: document.getElementById('chatSend'),
            chatEmoji: document.getElementById('chatEmoji'),
            chatAttach: document.getElementById('chatAttach'),
            chatTyping: document.getElementById('chatTyping'),
            chatOnline: document.getElementById('chatOnline'),
            chatScroll: document.getElementById('chatScroll'),
            chatEmpty: document.getElementById('chatEmpty'),
            chatLoading: document.getElementById('chatLoading'),
            chatError: document.getElementById('chatError')
        };
    }

    async init() {
        this.setupEventListeners();
        await this.loadChat();
    }

    setupEventListeners() {
        // Обработка отправки сообщения
        this.elements.chatSend?.addEventListener('click', () => {
            this.sendMessage();
        });

        // Обработка ввода сообщения
        this.elements.chatInput?.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                this.sendMessage();
            }
        });

        // Обработка эмодзи
        this.elements.chatEmoji?.addEventListener('click', () => {
            this.toggleEmojiPicker();
        });

        // Обработка вложений
        this.elements.chatAttach?.addEventListener('click', () => {
            this.handleAttachment();
        });

        // Обработка скролла
        this.elements.chatScroll?.addEventListener('scroll', () => {
            this.handleScroll();
        });

        // Обработка печати
        this.elements.chatInput?.addEventListener('input', () => {
            this.handleTyping();
        });
    }

    async loadChat() {
        try {
            this.showLoading();
            const data = await this.chatService.getChat();
            this.renderChat(data);
            this.hideLoading();
            return true;
        } catch (error) {
            console.error('Error loading chat:', error);
            this.showError();
            return false;
        }
    }

    async sendMessage() {
        if (!this.elements.chatInput) return;

        const message = this.elements.chatInput.value.trim();
        if (!message) return;

        try {
            const sanitizedMessage = this.securityService.sanitizeData(message);
            await this.chatService.sendMessage(sanitizedMessage);
            this.elements.chatInput.value = '';
            this.scrollToBottom();
        } catch (error) {
            console.error('Error sending message:', error);
            TelegramUtils.showAlert('Ошибка при отправке сообщения');
        }
    }

    async handleAttachment() {
        try {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.style.display = 'none';

            fileInput.addEventListener('change', async (event) => {
                const file = event.target.files[0];
                if (!file) return;

                try {
                    const validatedFile = await this.securityService.validateFile(file);
                    await this.uploadAttachment(validatedFile);
                } catch (error) {
                    console.error('Error handling attachment:', error);
                    TelegramUtils.showAlert('Ошибка при загрузке вложения');
                } finally {
                    document.body.removeChild(fileInput);
                }
            });

            document.body.appendChild(fileInput);
            fileInput.click();
        } catch (error) {
            console.error('Error handling attachment click:', error);
        }
    }

    async uploadAttachment(file) {
        try {
            // Здесь должна быть логика загрузки файла на сервер
            // После успешной загрузки отправляем сообщение с вложением
            const message = {
                type: 'attachment',
                file_url: URL.createObjectURL(file.file),
                file_name: file.file.name,
                file_size: file.file.size,
                file_type: file.file.type
            };

            await this.chatService.sendMessage(message);
            this.scrollToBottom();
        } catch (error) {
            console.error('Error uploading attachment:', error);
            throw error;
        }
    }

    toggleEmojiPicker() {
        // Здесь должна быть логика отображения/скрытия пикера эмодзи
        console.log('Toggle emoji picker');
    }

    handleTyping() {
        this.chatService.sendTyping();
    }

    handleScroll() {
        if (!this.elements.chatScroll) return;

        const { scrollTop } = this.elements.chatScroll;
        if (scrollTop === 0) {
            this.loadMoreMessages();
        }
    }

    async loadMoreMessages() {
        try {
            const data = await this.chatService.loadMoreMessages();
            this.prependMessages(data);
        } catch (error) {
            console.error('Error loading more messages:', error);
        }
    }

    renderChat(data) {
        if (!this.elements.chatMessages) return;

        // Очищаем чат
        this.elements.chatMessages.innerHTML = '';

        if (!data || data.length === 0) {
            this.showEmpty();
            return;
        }

        // Рендерим сообщения
        data.forEach(message => {
            const messageElement = this.createMessageElement(message);
            this.elements.chatMessages.appendChild(messageElement);
        });

        // Скроллим вниз
        this.scrollToBottom();
    }

    prependMessages(data) {
        if (!this.elements.chatMessages || !data || data.length === 0) return;

        const fragment = document.createDocumentFragment();
        data.forEach(message => {
            const messageElement = this.createMessageElement(message);
            fragment.appendChild(messageElement);
        });

        this.elements.chatMessages.insertBefore(fragment, this.elements.chatMessages.firstChild);
    }

    createMessageElement(message) {
        const element = document.createElement('div');
        element.className = `chat-message ${message.is_own ? 'own' : ''}`;
        element.setAttribute('data-message-id', message.id);

        // Аватар
        const avatar = document.createElement('img');
        avatar.className = 'chat-avatar';
        avatar.src = message.photo_url || 'assets/images/default-avatar.png';
        avatar.alt = message.username;
        element.appendChild(avatar);

        // Контент
        const content = document.createElement('div');
        content.className = 'chat-content';

        // Имя пользователя
        const username = document.createElement('div');
        username.className = 'chat-username';
        username.textContent = message.username;
        content.appendChild(username);

        // Текст сообщения
        if (message.type === 'text') {
            const text = document.createElement('div');
            text.className = 'chat-text';
            text.textContent = message.text;
            content.appendChild(text);
        } else if (message.type === 'attachment') {
            const attachment = document.createElement('div');
            attachment.className = 'chat-attachment';
            
            if (message.file_type.startsWith('image/')) {
                const image = document.createElement('img');
                image.src = message.file_url;
                image.alt = message.file_name;
                attachment.appendChild(image);
            } else {
                const file = document.createElement('div');
                file.className = 'chat-file';
                file.textContent = `${message.file_name} (${Utils.formatFileSize(message.file_size)})`;
                attachment.appendChild(file);
            }

            content.appendChild(attachment);
        }

        // Время
        const time = document.createElement('div');
        time.className = 'chat-time';
        time.textContent = Utils.formatTime(message.timestamp);
        content.appendChild(time);

        element.appendChild(content);
        return element;
    }

    scrollToBottom() {
        if (!this.elements.chatScroll) return;

        this.elements.chatScroll.scrollTop = this.elements.chatScroll.scrollHeight;
    }

    // Методы для работы с состоянием
    showLoading() {
        this.elements.chatLoading?.classList.remove('hidden');
        this.elements.chatMessages?.classList.add('hidden');
        this.elements.chatEmpty?.classList.add('hidden');
        this.elements.chatError?.classList.add('hidden');
    }

    hideLoading() {
        this.elements.chatLoading?.classList.add('hidden');
        this.elements.chatMessages?.classList.remove('hidden');
    }

    showEmpty() {
        this.elements.chatEmpty?.classList.remove('hidden');
        this.elements.chatMessages?.classList.add('hidden');
        this.elements.chatLoading?.classList.add('hidden');
        this.elements.chatError?.classList.add('hidden');
    }

    showError() {
        this.elements.chatError?.classList.remove('hidden');
        this.elements.chatMessages?.classList.add('hidden');
        this.elements.chatLoading?.classList.add('hidden');
        this.elements.chatEmpty?.classList.add('hidden');
    }

    // Методы для работы с доступностью
    setAccessibility(accessible) {
        if (!this.elements.chatContainer) return;

        this.elements.chatContainer.setAttribute('aria-hidden', !accessible);
        this.elements.chatInput?.setAttribute('aria-disabled', !accessible);
        this.elements.chatSend?.setAttribute('aria-disabled', !accessible);
        this.elements.chatEmoji?.setAttribute('aria-disabled', !accessible);
        this.elements.chatAttach?.setAttribute('aria-disabled', !accessible);
    }

    // Очистка
    cleanup() {
        // Удаляем обработчики событий
        this.elements.chatSend?.removeEventListener('click', this.sendMessage);
        this.elements.chatInput?.removeEventListener('keypress', this.handleKeyPress);
        this.elements.chatEmoji?.removeEventListener('click', this.toggleEmojiPicker);
        this.elements.chatAttach?.removeEventListener('click', this.handleAttachment);
        this.elements.chatScroll?.removeEventListener('scroll', this.handleScroll);
        this.elements.chatInput?.removeEventListener('input', this.handleTyping);
    }
} 