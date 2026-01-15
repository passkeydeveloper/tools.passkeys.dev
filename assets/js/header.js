function loadHeader(options) {
    const rootPath = options.root || '.';
    const basePath = options.base || '../';
    const logoPath = `${rootPath}/assets/img/pdd-icon-color-simple.svg`;
    const homePath = `${rootPath}/`;
    const featureDetectPath = `${basePath}/featuredetect/`;
    const relatedOriginsPath = `${basePath}/relatedorigins/`;

    const currentPath = window.location.pathname;

    // Simple helper to check active status
    const isActive = (pathPart) => currentPath.includes(pathPart);

    // Styling classes
    // active dropdown item gets standard bootstrap blue background

    const headerHtml = `
    <nav class="navbar navbar-expand-lg navbar-light bg-white border-bottom mb-4">
        <div class="container">
            <a class="navbar-brand d-flex align-items-center me-4" href="${homePath}">
                <img src="${logoPath}" alt="Logo" width="40" height="40" class="me-2 rounded-2">
                <span class="fw-bold text-dark">Passkey Developer Tools</span>
            </a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
                aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <div class="dropdown">
                    <button class="btn btn-outline-secondary dropdown-toggle" type="button" id="toolSelectDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                        Change Tool
                    </button>
                    <ul class="dropdown-menu" aria-labelledby="toolSelectDropdown">
                        <li><a class="dropdown-item ${isActive('featuredetect') ? 'active' : ''}" href="${featureDetectPath}">Feature Detection</a></li>
                        <li><a class="dropdown-item ${isActive('relatedorigins') ? 'active' : ''}" href="${relatedOriginsPath}">Related Origin Requests Validator</a></li>
                    </ul>
                </div>
            </div>
        </div>
    </nav>
    `;

    document.write(headerHtml);
}
