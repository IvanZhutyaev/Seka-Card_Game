import { HelpService } from '../services/help.service.js';
import { SecurityService } from '../services/security.service.js';

export class HelpComponent {
    constructor() {
        this.helpService = new HelpService();
        this.securityService = new SecurityService();
        this.elements = {
            helpContainer: document.getElementById('helpContainer'),
            helpContent: document.getElementById('helpContent'),
            helpSearch: document.getElementById('helpSearch'),
            helpCategories: document.getElementById('helpCategories'),
            helpArticles: document.getElementById('helpArticles'),
            helpArticle: document.getElementById('helpArticle'),
            helpBack: document.getElementById('helpBack'),
            helpContact: document.getElementById('helpContact'),
            helpEmpty: document.getElementById('helpEmpty'),
            helpLoading: document.getElementById('helpLoading'),
            helpError: document.getElementById('helpError')
        };
    }

    async init() {
        this.setupEventListeners();
        await this.loadHelp();
    }

    setupEventListeners() {
        // Обработка поиска
        this.elements.helpSearch?.addEventListener('input', (event) => {
            this.searchHelp(event.target.value);
        });

        // Обработка категорий
        this.elements.helpCategories?.addEventListener('click', (event) => {
            const category = event.target.getAttribute('data-category');
            if (category) {
                this.loadCategory(category);
            }
        });

        // Обработка статей
        this.elements.helpArticles?.addEventListener('click', (event) => {
            const article = event.target.getAttribute('data-article');
            if (article) {
                this.loadArticle(article);
            }
        });

        // Обработка кнопки назад
        this.elements.helpBack?.addEventListener('click', () => {
            this.goBack();
        });

        // Обработка контакта
        this.elements.helpContact?.addEventListener('click', () => {
            this.contactSupport();
        });
    }

    async loadHelp() {
        try {
            this.showLoading();
            const data = await this.helpService.getHelp();
            this.renderHelp(data);
            this.hideLoading();
            return true;
        } catch (error) {
            console.error('Error loading help:', error);
            this.showError();
            return false;
        }
    }

    async searchHelp(query) {
        try {
            const sanitizedQuery = this.securityService.sanitizeData(query);
            const data = await this.helpService.searchHelp(sanitizedQuery);
            this.renderSearchResults(data);
        } catch (error) {
            console.error('Error searching help:', error);
            TelegramUtils.showAlert('Ошибка при поиске');
        }
    }

    async loadCategory(category) {
        try {
            const sanitizedCategory = this.securityService.sanitizeData(category);
            const data = await this.helpService.getCategory(sanitizedCategory);
            this.renderCategory(data);
        } catch (error) {
            console.error('Error loading category:', error);
            TelegramUtils.showAlert('Ошибка при загрузке категории');
        }
    }

    async loadArticle(article) {
        try {
            const sanitizedArticle = this.securityService.sanitizeData(article);
            const data = await this.helpService.getArticle(sanitizedArticle);
            this.renderArticle(data);
        } catch (error) {
            console.error('Error loading article:', error);
            TelegramUtils.showAlert('Ошибка при загрузке статьи');
        }
    }

    goBack() {
        if (this.elements.helpArticle?.classList.contains('hidden')) {
            this.elements.helpCategories?.classList.remove('hidden');
            this.elements.helpArticles?.classList.add('hidden');
        } else {
            this.elements.helpArticle?.classList.add('hidden');
            this.elements.helpArticles?.classList.remove('hidden');
        }
    }

    async contactSupport() {
        try {
            await this.helpService.contactSupport();
            TelegramUtils.showAlert('Сообщение отправлено');
        } catch (error) {
            console.error('Error contacting support:', error);
            TelegramUtils.showAlert('Ошибка при отправке сообщения');
        }
    }

    renderHelp(data) {
        if (!this.elements.helpContent) return;

        if (!data || !data.categories || data.categories.length === 0) {
            this.showEmpty();
            return;
        }

        // Рендерим категории
        this.renderCategories(data.categories);
    }

    renderCategories(categories) {
        if (!this.elements.helpCategories) return;

        // Очищаем категории
        this.elements.helpCategories.innerHTML = '';

        // Рендерим категории
        categories.forEach(category => {
            const element = this.createCategoryElement(category);
            this.elements.helpCategories.appendChild(element);
        });
    }

    createCategoryElement(category) {
        const element = document.createElement('div');
        element.className = 'help-category';
        element.setAttribute('data-category', category.id);

        // Иконка
        const icon = document.createElement('span');
        icon.className = 'help-category-icon';
        icon.textContent = category.icon;
        element.appendChild(icon);

        // Название
        const name = document.createElement('span');
        name.className = 'help-category-name';
        name.textContent = category.name;
        element.appendChild(name);

        // Описание
        const description = document.createElement('span');
        description.className = 'help-category-description';
        description.textContent = category.description;
        element.appendChild(description);

        return element;
    }

    renderSearchResults(results) {
        if (!this.elements.helpArticles) return;

        // Очищаем статьи
        this.elements.helpArticles.innerHTML = '';

        if (!results || results.length === 0) {
            this.showEmpty();
            return;
        }

        // Рендерим результаты
        results.forEach(article => {
            const element = this.createArticleElement(article);
            this.elements.helpArticles.appendChild(element);
        });
    }

    renderCategory(data) {
        if (!this.elements.helpArticles) return;

        // Очищаем статьи
        this.elements.helpArticles.innerHTML = '';

        if (!data || !data.articles || data.articles.length === 0) {
            this.showEmpty();
            return;
        }

        // Скрываем категории и показываем статьи
        this.elements.helpCategories?.classList.add('hidden');
        this.elements.helpArticles?.classList.remove('hidden');

        // Рендерим статьи
        data.articles.forEach(article => {
            const element = this.createArticleElement(article);
            this.elements.helpArticles.appendChild(element);
        });
    }

    createArticleElement(article) {
        const element = document.createElement('div');
        element.className = 'help-article';
        element.setAttribute('data-article', article.id);

        // Название
        const name = document.createElement('span');
        name.className = 'help-article-name';
        name.textContent = article.name;
        element.appendChild(name);

        // Описание
        const description = document.createElement('span');
        description.className = 'help-article-description';
        description.textContent = article.description;
        element.appendChild(description);

        return element;
    }

    renderArticle(data) {
        if (!this.elements.helpArticle) return;

        // Очищаем статью
        this.elements.helpArticle.innerHTML = '';

        if (!data) {
            this.showEmpty();
            return;
        }

        // Скрываем статьи и показываем статью
        this.elements.helpArticles?.classList.add('hidden');
        this.elements.helpArticle?.classList.remove('hidden');

        // Рендерим статью
        const element = this.createArticleContentElement(data);
        this.elements.helpArticle.appendChild(element);
    }

    createArticleContentElement(article) {
        const element = document.createElement('div');
        element.className = 'help-article-content';

        // Заголовок
        const title = document.createElement('h1');
        title.className = 'help-article-title';
        title.textContent = article.title;
        element.appendChild(title);

        // Содержимое
        const content = document.createElement('div');
        content.className = 'help-article-text';
        content.innerHTML = article.content;
        element.appendChild(content);

        return element;
    }

    // Методы для работы с состоянием
    showLoading() {
        this.elements.helpLoading?.classList.remove('hidden');
        this.elements.helpContent?.classList.add('hidden');
        this.elements.helpEmpty?.classList.add('hidden');
        this.elements.helpError?.classList.add('hidden');
    }

    hideLoading() {
        this.elements.helpLoading?.classList.add('hidden');
        this.elements.helpContent?.classList.remove('hidden');
    }

    showEmpty() {
        this.elements.helpEmpty?.classList.remove('hidden');
        this.elements.helpContent?.classList.add('hidden');
        this.elements.helpLoading?.classList.add('hidden');
        this.elements.helpError?.classList.add('hidden');
    }

    showError() {
        this.elements.helpError?.classList.remove('hidden');
        this.elements.helpContent?.classList.add('hidden');
        this.elements.helpLoading?.classList.add('hidden');
        this.elements.helpEmpty?.classList.add('hidden');
    }

    // Методы для работы с доступностью
    setAccessibility(accessible) {
        if (!this.elements.helpContainer) return;

        this.elements.helpContainer.setAttribute('aria-hidden', !accessible);
        this.elements.helpSearch?.setAttribute('aria-disabled', !accessible);
        this.elements.helpCategories?.setAttribute('aria-hidden', !accessible);
        this.elements.helpArticles?.setAttribute('aria-hidden', !accessible);
        this.elements.helpArticle?.setAttribute('aria-hidden', !accessible);
        this.elements.helpBack?.setAttribute('aria-disabled', !accessible);
        this.elements.helpContact?.setAttribute('aria-disabled', !accessible);
    }

    // Очистка
    cleanup() {
        // Удаляем обработчики событий
        this.elements.helpSearch?.removeEventListener('input', this.searchHelp);
        this.elements.helpCategories?.removeEventListener('click', this.handleCategoryClick);
        this.elements.helpArticles?.removeEventListener('click', this.handleArticleClick);
        this.elements.helpBack?.removeEventListener('click', this.goBack);
        this.elements.helpContact?.removeEventListener('click', this.contactSupport);
    }
} 