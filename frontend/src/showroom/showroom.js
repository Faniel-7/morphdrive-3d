
const CATEGORIES = [
  'All',
  'Cars',
  'Motorcycles',
  'Aircraft',
  'Helicopters',
  'Trucks'
];

export function createShowroom({ vehicles, onPreview, onExplore }) {
  if (!Array.isArray(vehicles) || vehicles.length === 0) {
    throw new Error('Showroom requires at least one vehicle.');
  }

  if (typeof onPreview !== 'function' || typeof onExplore !== 'function') {
    throw new Error('Showroom requires preview and explore callbacks.');
  }

  const root = document.createElement('section');
  root.className = 'showroom';
  root.setAttribute('aria-label', 'MorphDrive 3D vehicle showroom');

  root.innerHTML = `
    <div class="showroom-background">
      <div class="showroom-grid"></div>
      <div class="showroom-glow showroom-glow-one"></div>
      <div class="showroom-glow showroom-glow-two"></div>
    </div>

    <div class="showroom-content">
      <header class="showroom-header">
        <a class="showroom-brand" href="#" aria-label="MorphDrive home">
          <span class="showroom-brand-symbol">⬡</span>
          <span>
            <strong>MORPHDRIVE</strong>
            <small>3D VEHICLE EXPLORER</small>
          </span>
        </a>

        <div class="showroom-header-status">
          <span class="showroom-status-dot"></span>
          <span>VEHICLE COLLECTION ONLINE</span>
        </div>
      </header>

      <main class="showroom-main">
        <section class="showroom-hero">
          <div class="showroom-vehicle-info">
            <div class="showroom-eyebrow">
              <span></span>
              THE DIGITAL VEHICLE GALLERY
            </div>

            <div class="showroom-number" data-role="vehicle-number">01</div>

            <div class="showroom-info-content">
              <span class="showroom-selection-label">CURRENTLY SELECTED</span>
              <h1 data-role="selected-name">Vehicle</h1>
              <div class="showroom-selection-type" data-role="selected-type"></div>
              <p data-role="selected-description"></p>

              <div class="showroom-preview-status">
                <span class="showroom-status-indicator"></span>
                <span data-role="preview-status">PREPARING 3D MODEL</span>
              </div>

              <button type="button" class="showroom-explore" data-role="explore" disabled>
                <span>Explore vehicle</span>
                <span class="showroom-explore-arrow">↗</span>
              </button>

              <div class="showroom-explore-caption">
                ENTER THE INTERACTIVE 3D COCKPIT
              </div>
            </div>
          </div>

          <div class="showroom-display">
            <div class="showroom-display-top">
              <span>LIVE 3D PREVIEW</span>
              <span data-role="display-category">CARS</span>
            </div>

            <div class="showroom-stage">
              <div class="showroom-stage-rings">
                <div class="showroom-stage-ring showroom-stage-ring-one"></div>
                <div class="showroom-stage-ring showroom-stage-ring-two"></div>
                <div class="showroom-stage-ring showroom-stage-ring-three"></div>
              </div>

              <div class="showroom-preview-host" data-role="preview-host"></div>

              <div class="showroom-preview-loading" data-role="preview-loading">
                <div class="showroom-loader"></div>
                <span>LOADING VEHICLE MODEL</span>
              </div>

              <div class="showroom-preview-error" data-role="preview-error"></div>

              <div class="showroom-stage-corner showroom-corner-top-left"></div>
              <div class="showroom-stage-corner showroom-corner-top-right"></div>
              <div class="showroom-stage-corner showroom-corner-bottom-left"></div>
              <div class="showroom-stage-corner showroom-corner-bottom-right"></div>
            </div>

            <div class="showroom-display-bottom">
              <span>INTERACTIVE MODEL</span>
              <span>DRAG TO ORBIT · SCROLL TO ZOOM</span>
            </div>
          </div>
        </section>

        <section class="showroom-collection">
          <div class="showroom-collection-heading">
            <div>
              <span class="showroom-section-label">DISCOVER THE COLLECTION</span>
              <h2>Choose your vehicle</h2>
            </div>

            <span class="showroom-count" data-role="count"></span>
          </div>

          <nav class="showroom-categories" data-role="categories" aria-label="Vehicle categories">
            ${CATEGORIES.map(category => `
              <button
                type="button"
                class="showroom-category ${category === 'All' ? 'is-active' : ''}"
                data-category="${category}"
                aria-pressed="${category === 'All'}"
              >${category}</button>
            `).join('')}
          </nav>

          <div class="showroom-carousel-wrapper">
            <button
              type="button"
              class="showroom-scroll-button showroom-scroll-left"
              data-role="scroll-left"
              aria-label="Scroll vehicles left"
            >‹</button>

            <div class="showroom-carousel" data-role="carousel"></div>

            <button
              type="button"
              class="showroom-scroll-button showroom-scroll-right"
              data-role="scroll-right"
              aria-label="Scroll vehicles right"
            >›</button>
          </div>
        </section>
      </main>

      <footer class="showroom-footer">
        <span>MORPHDRIVE 3D</span>
        <span>COMPUTER VISION · INTERACTIVE 3D · VEHICLE EXPLORATION</span>
        <span data-role="footer-count"></span>
      </footer>
    </div>
  `;

  const app = document.querySelector('#app');

  if (!app) {
    throw new Error('MorphDrive application root was not found.');
  }

  app.append(root);

  const categoryContainer = root.querySelector('[data-role="categories"]');
  const carousel = root.querySelector('[data-role="carousel"]');
  const previewHost = root.querySelector('[data-role="preview-host"]');
  const count = root.querySelector('[data-role="count"]');
  const footerCount = root.querySelector('[data-role="footer-count"]');
  const selectedName = root.querySelector('[data-role="selected-name"]');
  const selectedType = root.querySelector('[data-role="selected-type"]');
  const selectedDescription = root.querySelector('[data-role="selected-description"]');
  const vehicleNumber = root.querySelector('[data-role="vehicle-number"]');
  const displayCategory = root.querySelector('[data-role="display-category"]');
  const previewStatus = root.querySelector('[data-role="preview-status"]');
  const previewLoading = root.querySelector('[data-role="preview-loading"]');
  const previewError = root.querySelector('[data-role="preview-error"]');
  const exploreButton = root.querySelector('[data-role="explore"]');
  const scrollLeft = root.querySelector('[data-role="scroll-left"]');
  const scrollRight = root.querySelector('[data-role="scroll-right"]');

  let activeCategory = 'All';
  let selectedId = vehicles.find(vehicle => vehicle.id === 'sedan')?.id || vehicles[0].id;
  let previewRequest = 0;
  let previewReady = false;

  function getSelectedVehicle() {
    return vehicles.find(vehicle => vehicle.id === selectedId) || vehicles[0];
  }

  function renderCategories() {
    for (const button of categoryContainer.querySelectorAll('[data-category]')) {
      const active = button.dataset.category === activeCategory;

      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
  }

  function renderVehicles() {
    const visibleVehicles = activeCategory === 'All'
      ? vehicles
      : vehicles.filter(vehicle => vehicle.category === activeCategory);

    carousel.replaceChildren();

    for (const vehicle of visibleVehicles) {
      const index = vehicles.indexOf(vehicle);

      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'showroom-card';
      card.dataset.vehicleId = vehicle.id;
      card.classList.toggle('is-selected', vehicle.id === selectedId);
      card.setAttribute('aria-pressed', String(vehicle.id === selectedId));

      const number = document.createElement('span');
      number.className = 'showroom-card-number';
      number.textContent = String(index + 1).padStart(2, '0');

      const details = document.createElement('span');
      details.className = 'showroom-card-details';

      const category = document.createElement('span');
      category.className = 'showroom-card-category';
      category.textContent = vehicle.category;

      const name = document.createElement('span');
      name.className = 'showroom-card-name';
      name.textContent = vehicle.name;

      const marker = document.createElement('span');
      marker.className = 'showroom-card-marker';

      details.append(category, name);
      card.append(number, details, marker);
      carousel.append(card);
    }

    count.textContent = `${visibleVehicles.length} VEHICLES`;
    footerCount.textContent = `${vehicles.length} MODELS AVAILABLE`;

    scrollLeft.disabled = visibleVehicles.length <= 3;
    scrollRight.disabled = visibleVehicles.length <= 3;
  }

  function renderSelection() {
    const vehicle = getSelectedVehicle();
    const index = vehicles.indexOf(vehicle) + 1;

    selectedName.textContent = vehicle.name;
    selectedType.textContent =
      `${vehicle.type.toUpperCase()}  /  ${vehicle.category.toUpperCase()}`;

    selectedDescription.textContent = vehicle.description || '';

    vehicleNumber.textContent = String(index).padStart(2, '0');
    displayCategory.textContent = vehicle.category.toUpperCase();
  }

  function render() {
    renderCategories();
    renderVehicles();
    renderSelection();
  }

  async function loadPreview(id) {
    const request = ++previewRequest;

    previewReady = false;
    exploreButton.disabled = true;

    previewError.textContent = '';
    previewError.classList.remove('is-visible');

    previewLoading.classList.remove('is-hidden');
    previewStatus.textContent = 'LOADING VEHICLE MODEL';

    try {
      const loaded = await onPreview(id);

      if (request !== previewRequest) return;

      if (!loaded) {
        previewLoading.classList.add('is-hidden');
        previewError.textContent = 'Could not load this vehicle. Try selecting it again.';
        previewError.classList.add('is-visible');
        previewStatus.textContent = 'MODEL LOAD FAILED';
        return;
      }

      previewReady = true;
      exploreButton.disabled = false;

      previewLoading.classList.add('is-hidden');
      previewStatus.textContent = '3D MODEL READY';
    } catch (error) {
      if (request !== previewRequest) return;

      console.error('MorphDrive showroom preview failed:', error);

      previewLoading.classList.add('is-hidden');
      previewError.textContent = 'Could not load this vehicle. Try selecting it again.';
      previewError.classList.add('is-visible');
      previewStatus.textContent = 'MODEL LOAD FAILED';
    }
  }

  function selectVehicle(id) {
    if (!vehicles.some(vehicle => vehicle.id === id)) return;

    if (selectedId === id) return;

    selectedId = id;
    render();
    loadPreview(id);
  }

  categoryContainer.addEventListener('click', event => {
    const button = event.target.closest('[data-category]');

    if (!button) return;

    activeCategory = button.dataset.category;
    render();
  });

  carousel.addEventListener('click', event => {
    const card = event.target.closest('[data-vehicle-id]');

    if (!card) return;

    selectVehicle(card.dataset.vehicleId);
  });

  exploreButton.addEventListener('click', async () => {
    if (!previewReady) return;

    exploreButton.disabled = true;
    previewStatus.textContent = 'ENTERING 3D COCKPIT';

    try {
      await onExplore(selectedId);
    } catch (error) {
      console.error('MorphDrive showroom transition failed:', error);
      exploreButton.disabled = false;
      previewStatus.textContent = '3D MODEL READY';
    }
  });

  scrollLeft.addEventListener('click', () => {
    carousel.scrollBy({
      left: -Math.max(260, carousel.clientWidth * 0.7),
      behavior: 'smooth'
    });
  });

  scrollRight.addEventListener('click', () => {
    carousel.scrollBy({
      left: Math.max(260, carousel.clientWidth * 0.7),
      behavior: 'smooth'
    });
  });

  root.querySelector('.showroom-brand').addEventListener('click', event => {
    event.preventDefault();

    activeCategory = 'All';
    carousel.scrollTo({ left: 0, behavior: 'smooth' });
    render();
    selectVehicle('sedan');
  });

  render();
  loadPreview(selectedId);

  return {
    show() {
      root.classList.remove('is-hidden');
    },

    hide() {
      root.classList.add('is-hidden');
    },

    select(id) {
      if (!vehicles.some(vehicle => vehicle.id === id)) return;

      activeCategory = 'All';
      carousel.scrollTo({ left: 0, behavior: 'smooth' });

      if (selectedId !== id) {
        selectVehicle(id);
      } else {
        render();
      }
    },

    getPreviewHost() {
      return previewHost;
    },

    destroy() {
      previewRequest++;
      root.remove();
    }
  };
}
