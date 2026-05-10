// Master Page Builder - Creates dynamic pages automatically
class PageBuilder {
    constructor(config) {
        this.config = config;
        this.user = Auth.getUser();
    }

    static async buildPage(pageConfig) {
        const builder = new PageBuilder(pageConfig);
        await builder.initialize();
        return builder;
    }

    async initialize() {
        this.setupNavigation();
        this.loadPageContent();
        this.setupEventListeners();
        this.applyRoleBasedAccess();
    }

    setupNavigation() {
        const nav = document.querySelector('.nav-menu');
        if (!nav) return;

        const role = Auth.getRole();
        const navItems = this.getNavItemsForRole(role);
        
        nav.innerHTML = navItems.map(item => `
            <a href="${item.url}" class="nav-link ${this.isCurrentPage(item.url) ? 'active' : ''}">
                ${item.icon ? `<svg>...</svg>` : ''}
                ${item.label}
            </a>
        `).join('');
    }

    getNavItemsForRole(role) {
        const navConfigs = {
            patient: [
                { url: 'patient-dashboard.html', label: 'Dashboard', icon: true },
                { url: 'appointment-list.html', label: 'Book Appointment', icon: true },
                { url: 'patient-reports.html', label: 'Reports', icon: true },
                { url: 'patient-vitals.html', label: 'Vitals', icon: true },
                { url: 'ai-nurse.html', label: 'AI Nurse', icon: true },
                { url: 'patient-emergency.html', label: 'Emergency', icon: true, class: 'emergency-link' }
            ],
            doctor: [
                { url: 'doctor-dashboard.html', label: 'Dashboard', icon: true },
                { url: 'doctor-appointments.html', label: 'Appointments', icon: true },
                { url: 'doctor-patient-view.html', label: 'Patients', icon: true },
                { url: 'doctor-chat-approval.html', label: 'Chat Requests', icon: true },
                { url: 'doctor-reports.html', label: 'Reports', icon: true }
            ],
            nurse: [
                { url: 'nurse-dashboard.html', label: 'Dashboard', icon: true },
                { url: 'nurse-patient-queue.html', label: 'Patient Queue', icon: true },
                { url: 'nurse-case-review.html', label: 'Case Review', icon: true },
                { url: 'nurse-notes.html', label: 'Notes', icon: true }
            ]
        };
        
        return navConfigs[role] || [];
    }

    isCurrentPage(url) {
        return window.location.pathname.includes(url);
    }

    async loadPageContent() {
        const mainContent = document.querySelector('main');
        if (!mainContent) return;

        LoadingOverlay.show();
        
        try {
            const data = await this.fetchPageData();
            mainContent.innerHTML = this.renderContent(data);
            this.initializePageSpecificFeatures(data);
        } catch (error) {
            console.error('Error loading page:', error);
            mainContent.innerHTML = this.renderErrorState();
        } finally {
            LoadingOverlay.hide();
        }
    }

    async fetchPageData() {
        const endpoints = {
            'appointment-list.html': '/doctor/list',
            'appointment-book.html': '/doctor/:id',
            'patient-reports.html': '/reports?patientId=me',
            'patient-vitals.html': '/vitals?patientId=me',
            'doctor-appointments.html': '/doctor-appointments',
            'nurse-patient-queue.html': '/nurse/patient-queue'
        };
        
        const currentPage = window.location.pathname.split('/').pop();
        const endpoint = endpoints[currentPage];
        
        if (endpoint) {
            return await API.get(endpoint);
        }
        
        return null;
    }

    renderContent(data) {
        // Base template for all pages
        return `
            <div class="page-container">
                ${this.renderPageHeader()}
                ${this.renderPageContent(data)}
                ${this.renderPageFooter()}
            </div>
        `;
    }

    renderPageHeader() {
        return `
            <div class="page-header glass-container">
                <h1>${this.config.title}</h1>
                ${this.config.subtitle ? `<p>${this.config.subtitle}</p>` : ''}
                ${this.renderQuickActions()}
            </div>
        `;
    }

    renderQuickActions() {
        if (!this.config.quickActions) return '';
        
        return `
            <div class="quick-actions">
                ${this.config.quickActions.map(action => `
                    <button class="btn btn-${action.type}" onclick="${action.handler}">
                        ${action.icon}
                        ${action.label}
                    </button>
                `).join('')}
            </div>
        `;
    }

    renderPageContent(data) {
        if (!data) {
            return '<div class="empty-state">No data available</div>';
        }
        
        if (this.config.renderFunction) {
            return this.config.renderFunction(data);
        }
        
        return this.defaultRenderer(data);
    }

    defaultRenderer(data) {
        if (Array.isArray(data)) {
            return this.renderList(data);
        } else if (typeof data === 'object') {
            return this.renderGrid(data);
        }
        return '<div>Content</div>';
    }

    renderList(items) {
        return `
            <div class="data-list">
                ${items.map(item => this.renderListItem(item)).join('')}
            </div>
        `;
    }

    renderListItem(item) {
        return `
            <div class="list-item glass-container" onclick="handleItemClick('${item.id}')">
                ${this.config.itemTemplate ? this.config.itemTemplate(item) : this.defaultItemTemplate(item)}
            </div>
        `;
    }

    defaultItemTemplate(item) {
        return `
            <div class="item-content">
                <h3>${item.name || item.title || 'Item'}</h3>
                <p>${item.description || ''}</p>
            </div>
            <div class="item-actions">
                <button class="btn btn-sm">View</button>
            </div>
        `;
    }

    renderGrid(data) {
        return `
            <div class="data-grid">
                ${Object.entries(data).map(([key, value]) => `
                    <div class="grid-item">
                        <label>${key}</label>
                        <span>${value}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderPageFooter() {
        return `
            <div class="page-footer">
                <p>Last updated: ${new Date().toLocaleString()}</p>
            </div>
        `;
    }

    renderErrorState() {
        return `
            <div class="error-state glass-container">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="#ef4444">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <h2>Oops! Something went wrong</h2>
                <p>We couldn't load this page. Please try again.</p>
                <button class="btn btn-primary" onclick="location.reload()">Retry</button>
            </div>
        `;
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.handleSearch(e.target.value);
            }, 300));
        }
        
        // Filter functionality
        document.querySelectorAll('.filter-select').forEach(select => {
            select.addEventListener('change', (e) => {
                this.handleFilter(e.target.value);
            });
        });
        
        // Sort functionality
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleSort(btn.dataset.sort);
            });
        });
    }

    handleSearch(query) {
        if (this.config.onSearch) {
            this.config.onSearch(query);
        }
    }

    handleFilter(filter) {
        if (this.config.onFilter) {
            this.config.onFilter(filter);
        }
    }

    handleSort(sortBy) {
        if (this.config.onSort) {
            this.config.onSort(sortBy);
        }
    }

    applyRoleBasedAccess() {
        const role = Auth.getRole();
        const allowedRoles = this.config.allowedRoles || ['patient', 'doctor', 'nurse'];
        
        if (!allowedRoles.includes(role)) {
            window.location.href = 'dashboard-home.html';
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    initializePageSpecificFeatures(data) {
        if (this.config.onLoad) {
            this.config.onLoad(data);
        }
    }
}

// Quick Page Generator Function
function createPage(config) {
    document.addEventListener('DOMContentLoaded', async () => {
        if (requireRole(config.allowedRoles)) {
            await PageBuilder.buildPage(config);
        }
    });
}
