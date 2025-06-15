// Navigation utilities
function openPage(page) {
    window.location.href = `/${page}`;
}

function goBack() {
    window.history.back();
}

function openSection(section) {
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showAlert(`Функционал "${section}" в разработке`);
    } else {
        alert(`Функционал "${section}" в разработке`);
    }
}

// Export functions
window.openPage = openPage;
window.goBack = goBack;
window.openSection = openSection; 