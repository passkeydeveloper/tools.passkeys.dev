function loadFooter(options) {
    const rootPath = options.root || '.';
    const logoPath = `${rootPath}/assets/img/pdd-icon-color-simple.svg`;
    const featureDetectPath = `${rootPath}/featuredetect/`;
    const relatedOriginsPath = `${rootPath}/relatedorigins/`;

    const footerHtml = `
    <footer class="footer mt-auto py-4 bg-white border-top">
        <div class="container">
            <div class="d-flex flex-column flex-md-row justify-content-md-between align-items-center">
                <!-- Left Side: Logo + Text -->
                <div class="d-flex align-items-center mb-2 mb-md-0" style="min-width: 0;">
                    <a href="https://passkeys.dev" class="d-flex align-items-center text-decoration-none text-dark me-3 flex-shrink-0">
                        <img src="${logoPath}" alt="Logo" width="24" height="24" class="me-2">
                        <span class="fw-bold">passkeys.dev</span>
                    </a>
                    <span class="text-muted small border-start ps-3 lh-sm">
                        Brought to you by members of the <a href="https://www.w3.org/groups/cg/wica/" target="_blank" class="text-decoration-none text-success">W3C Web Identity & Credentials Adoption CG</a> and the <a href="https://fidoalliance.org/" target="_blank" class="text-decoration-none text-success">FIDO Alliance</a>.
                    </span>
                </div>
                
                <!-- Right Side: Privacy -->
                <div class="flex-shrink-0 ms-md-3">
                     <a href="https://passkeys.dev/privacy-policy/" target="_blank" class="text-decoration-none text-muted small">Privacy</a>
                </div>
            </div>
        </div>
    </footer>
    `;

    document.write(footerHtml);
}
