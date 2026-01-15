// Navbar Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close menu when clicking a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
}

// Scroll animations
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
        }
    });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.feature-card, .tool-section').forEach(el => {
    observer.observe(el);
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    });
});

// Copy to clipboard function
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Texto copiado para a área de transferência!', 'success');
    }).catch(err => {
        showNotification('Erro ao copiar texto', 'error');
        console.error('Erro ao copiar: ', err);
    });
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Add notification styles dynamically
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: var(--radius-md);
        padding: 1rem 1.5rem;
        box-shadow: var(--shadow-xl);
        display: flex;
        align-items: center;
        gap: 1rem;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
        border-left: 4px solid var(--primary-color);
    }
    
    .notification.success {
        border-left-color: var(--accent-color);
    }
    
    .notification.error {
        border-left-color: var(--danger-color);
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.8rem;
    }
    
    .notification-content i {
        font-size: 1.2rem;
    }
    
    .notification.success .notification-content i {
        color: var(--accent-color);
    }
    
    .notification.error .notification-content i {
        color: var(--danger-color);
    }
    
    .notification-close {
        background: none;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 1rem;
        padding: 0.2rem;
        border-radius: 4px;
        transition: all 0.2s ease;
    }
    
    .notification-close:hover {
        color: var(--danger-color);
        background: #f1f5f9;
    }
    
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(notificationStyles);

// Tool-specific functions
function formatCEP(cep) {
    return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
}

function formatCNPJ(cnpj) {
    cnpj = cnpj.replace(/\D/g, '');
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

function formatTelefone(telefone) {
    telefone = telefone.replace(/\D/g, '');
    if (telefone.length === 11) {
        return telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return telefone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
}

// Format JSON for display
function formatJSON(data) {
    return JSON.stringify(data, null, 2)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Highlight JSON syntax
function syntaxHighlight(json) {
    if (typeof json != 'string') {
        json = JSON.stringify(json, undefined, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

// Add syntax highlight styles
const syntaxStyles = document.createElement('style');
syntaxStyles.textContent = `
    .string { color: var(--accent-color); }
    .number { color: var(--primary-color); }
    .boolean { color: var(--warning-color); }
    .null { color: var(--danger-color); }
    .key { color: var(--secondary-color); font-weight: bold; }
`;
document.head.appendChild(syntaxStyles);

// Initialize tooltips
function initTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', (e) => {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = e.target.dataset.tooltip;
            document.body.appendChild(tooltip);
            
            const rect = e.target.getBoundingClientRect();
            tooltip.style.position = 'fixed';
            tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + 'px';
            tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
            tooltip.style.opacity = '0';
            
            setTimeout(() => {
                tooltip.style.opacity = '1';
                tooltip.style.transition = 'opacity 0.2s ease';
            }, 10);
            
            e.target.dataset.tooltipId = tooltip;
        });
        
        element.addEventListener('mouseleave', (e) => {
            const tooltip = e.target.dataset.tooltipId;
            if (tooltip && tooltip.parentNode) {
                tooltip.remove();
            }
        });
    });
}

// Add tooltip styles
const tooltipStyles = document.createElement('style');
tooltipStyles.textContent = `
    .tooltip {
        background: var(--dark-bg);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: var(--radius-sm);
        font-size: 0.9rem;
        z-index: 1000;
        pointer-events: none;
        white-space: nowrap;
        box-shadow: var(--shadow-lg);
    }
    
    .tooltip::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        margin-left: -5px;
        border-width: 5px;
        border-style: solid;
        border-color: var(--dark-bg) transparent transparent transparent;
    }
`;
document.head.appendChild(tooltipStyles);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initTooltips();
    
    // Check for hash in URL and scroll to section
    if (window.location.hash) {
        setTimeout(() => {
            const target = document.querySelector(window.location.hash);
            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 100,
                    behavior: 'smooth'
                });
            }
        }, 100);
    }
    
    // Add loading states to buttons
    document.querySelectorAll('button[onclick*="consultar"], button[onclick*="buscar"], button[onclick*="processar"]').forEach(button => {
        const originalClick = button.getAttribute('onclick');
        button.setAttribute('data-original-onclick', originalClick);
        button.removeAttribute('onclick');
        
        button.addEventListener('click', async function(e) {
            e.preventDefault();
            
            // Show loading state
            const originalHTML = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
            this.disabled = true;
            
            try {
                // Execute the original function
                const functionName = originalClick.match(/^(\w+)\(/)[1];
                if (typeof window[functionName] === 'function') {
                    await window[functionName].call(this);
                }
            } catch (error) {
                console.error('Error executing function:', error);
                showNotification('Erro ao processar requisição', 'error');
            } finally {
                // Restore button state
                setTimeout(() => {
                    this.innerHTML = originalHTML;
                    this.disabled = false;
                }, 500);
            }
        });
    });
});

// Export utility functions for use in other scripts
window.copyToClipboard = copyToClipboard;
window.showNotification = showNotification;
window.formatCEP = formatCEP;
window.formatCNPJ = formatCNPJ;
window.formatTelefone = formatTelefone;