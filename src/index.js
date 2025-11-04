import { IconQuote } from '@codexteam/icons';

import './index.css';

class AnnotationTool {
  static get CSS() {
    return 'afl-annotation-tool';
  }

  static get EVENT_LISTENER() {
    return 'at-has-data-listener';
  }

  static get isInline() {
    return true;
  }

  static get sanitize() {
    return {
      annotation: {
        class: true,
        contenteditable: true,
        style: true,
        'data-author': true,
        'data-year': true,
        'data-publication': true,
        'data-journal': true,
        'data-volume': true,
        'data-volume-initial-page': true,
        'data-volume-last-page': true,
        encoding: true,
      },
    };
  }

  constructor({ api, config }) {
    this.api = api;
    this.button = null;
    this.currentWrapper = null;
    this.saved = false;
    this.config = config || {};

    this.tag = 'ANNOTATION';
    this.addEventListenersToAll();
    this.closeOverlayOnBodyClick = this.closeOverlayOnBodyClick.bind(this);
  }

  render() {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.classList.add('ce-inline-tool', 'ce-inline-tool-annotation');
    this.button.innerHTML = IconQuote;

    return this.button;
  }

  surround(range) {
    if (!range) {
      return;
    }

    const selectedText = range.extractContents();

    const wrapper = document.createElement(this.tag);
    wrapper.appendChild(selectedText);
    wrapper.classList.add(AnnotationTool.CSS);
    wrapper.setAttribute('contenteditable', 'false');
    this.addEventListeners(wrapper);

    range.insertNode(wrapper);
    this.api.selection.expandToTag(wrapper);
    this.currentWrapper = wrapper;
    this.showOverlay();
  }

  checkState(selection) {
    if (!selection.rangeCount || selection.rangeCount <= 0) return;

    const parent = selection.anchorNode.parentElement;
    this.button.classList.toggle(
      'ce-inline-tool--active',
      parent && parent.closest(AnnotationTool.CSS)
    );
  }

  generateLabelElement(labelText, inputId, index, type = 'text', required = false) {
    const container = document.createElement('div');
    container.classList.add('annotation-field-container');

    const label = document.createElement('label');
    label.innerText = required ? `${labelText} *` : labelText;
    label.setAttribute('for', inputId);

    const input = document.createElement('input');
    input.setAttribute('id', inputId);
    input.setAttribute('type', type);
    input.classList.add('cdx-input');
    if (required) {
      input.setAttribute('required', 'true');
    }

    const errorMessage = document.createElement('div');
    errorMessage.classList.add('annotation-field-error');
    errorMessage.setAttribute('id', `${inputId}-error`);

    container.appendChild(label);
    container.appendChild(input);
    container.appendChild(errorMessage);

    return [container];
  }

  generateOverlay() {
    const overlay = document.createElement('div');
    overlay.classList.add('annotation-overlay');

    const closeButton = document.createElement('button');
    closeButton.classList.add('annotation-overlay-button-close');
    closeButton.id = 'annotation-cancel';
    closeButton.innerText = '✖';

    const buttonsWrapper = document.createElement('div');
    buttonsWrapper.classList.add('annotation-overlay-buttons-wrapper');
    const removeButton = document.createElement('button');
    removeButton.classList.add('annotation-overlay-button', 'annotation-overlay-remove-button');
    removeButton.id = 'annotation-remove';
    removeButton.innerText = 'Remove';
    buttonsWrapper.appendChild(removeButton);

    const saveButton = document.createElement('button');
    saveButton.classList.add('annotation-overlay-button', 'annotation-overlay-save-button');
    saveButton.id = 'annotation-save';
    saveButton.innerText = 'Save';
    buttonsWrapper.appendChild(saveButton);

    overlay.appendChild(closeButton);
    overlay.append(
      ...this.generateLabelElement('Publication Title', 'annotation-publication', 1, 'text', true)
    );
    overlay.append(
      ...this.generateLabelElement(
        'Authors (e.g. Doe J., Smith J.)',
        'annotation-author',
        2,
        'text',
        true
      )
    );
    overlay.append(
      ...this.generateLabelElement('Year of Publication', 'annotation-year', 3, 'number', false)
    );
    overlay.append(
      ...this.generateLabelElement(
        'Journal Name (abbreviated)',
        'annotation-journal',
        4,
        'text',
        false
      )
    );
    overlay.append(...this.generateLabelElement('Volume', 'annotation-volume', 5, 'text', false));
    overlay.append(
      ...this.generateLabelElement(
        'Initial Page',
        'annotation-volume-initial-page',
        6,
        'text',
        false
      )
    );
    overlay.append(
      ...this.generateLabelElement('Last Page', 'annotation-volume-last-page', 7, 'text', false)
    );
    overlay.appendChild(buttonsWrapper);

    const wrapper = this.api.selection.findParentTag(this.tag);

    wrapper.appendChild(overlay);

    // Add real-time validation
    this.setupValidation(saveButton);

    saveButton.addEventListener('click', (e) => {
      this.stopEventPropagation(e);
      this.saveMetadata();
    });

    closeButton.addEventListener('click', (e) => {
      this.stopEventPropagation(e);
      this.closeOverlay();
    });
    removeButton.addEventListener('click', (e) => {
      this.stopEventPropagation(e);
      this.removeWrapper();
    });

    this.repositionEquationArea.call(this, wrapper, overlay);
    this.observeOverlayResize(wrapper, overlay);

    overlay.addEventListener('click', this.stopEventPropagation);
    requestAnimationFrame(() => {
      document.body.addEventListener('click', this.closeOverlayOnBodyClick);
    });
  }

  closeOverlayOnBodyClick(e) {
    this.stopEventPropagation(e);
    this.closeOverlay();
  }

  stopEventPropagation(event) {
    event.stopPropagation();
  }

  extractTextFromElement(element) {
    return [].reduce.call(
      element.childNodes,
      function (a, b) {
        return a + (b.nodeType === 3 ? b.textContent : '');
      },
      ''
    );
  }

  populateWrapperData() {
    if (this.currentWrapper) {
      document.getElementById('annotation-author').value =
        this.currentWrapper.getAttribute('data-author') || '';
      document.getElementById('annotation-year').value =
        this.currentWrapper.getAttribute('data-year') || '';
      document.getElementById('annotation-publication').value =
        this.currentWrapper.getAttribute('data-publication') ||
        this.extractTextFromElement(this.currentWrapper);
      document.getElementById('annotation-journal').value =
        this.currentWrapper.getAttribute('data-journal') || '';
      document.getElementById('annotation-volume').value =
        this.currentWrapper.getAttribute('data-volume') || '';
      document.getElementById('annotation-volume-initial-page').value =
        this.currentWrapper.getAttribute('data-volume-initial-page') || '';
      document.getElementById('annotation-volume-last-page').value =
        this.currentWrapper.getAttribute('data-volume-last-page') || '';
    }
  }

  showOverlay() {
    if (document.querySelector('.annotation-overlay')) {
      return;
    }
    this.saved = false;

    this.generateOverlay();
    this.populateWrapperData();
  }

  /**
   * Sets up real-time validation for annotation fields
   * @param saveButton - The save button element to enable/disable
   */
  setupValidation(saveButton) {
    const fields = {
      'annotation-author': {
        required: true,
        maxLength: 500,
        validate: (value) => {
          if (!value.trim()) return 'Authors field is required';
          if (value.length > 500) return 'Authors field is too long (max 500 characters)';
          return null;
        },
      },
      'annotation-publication': {
        required: true,
        maxLength: 500,
        validate: (value) => {
          if (!value.trim()) return 'Publication title is required';
          if (value.length > 500) return 'Publication title is too long (max 500 characters)';
          return null;
        },
      },
      'annotation-year': {
        required: false,
        validate: (value) => {
          if (!value.trim()) return null;
          const yearNum = parseInt(value, 10);
          if (isNaN(yearNum) || yearNum < 1000 || yearNum > 2100) {
            return 'Year must be between 1000 and 2100';
          }
          return null;
        },
      },
      'annotation-journal': {
        required: false,
        maxLength: 200,
        validate: (value) => {
          if (value.length > 200) return 'Journal name is too long (max 200 characters)';
          return null;
        },
      },
      'annotation-volume': {
        required: false,
        maxLength: 50,
        validate: (value) => {
          if (value.length > 50) return 'Volume is too long (max 50 characters)';
          return null;
        },
      },
      'annotation-volume-initial-page': {
        required: false,
        maxLength: 20,
        validate: (value) => {
          if (value.length > 20) return 'Initial page is too long (max 20 characters)';
          return null;
        },
      },
      'annotation-volume-last-page': {
        required: false,
        maxLength: 20,
        validate: (value) => {
          if (value.length > 20) return 'Last page is too long (max 20 characters)';
          return null;
        },
      },
    };

    const validateField = (fieldId) => {
      const input = document.getElementById(fieldId);
      const errorDiv = document.getElementById(`${fieldId}-error`);
      const field = fields[fieldId];

      if (!input || !errorDiv || !field) return true;

      const error = field.validate(input.value);

      if (error) {
        input.classList.add('error');
        errorDiv.textContent = error;
        errorDiv.style.display = 'block';
        return false;
      } else {
        input.classList.remove('error');
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
        return true;
      }
    };

    const validateAll = () => {
      let isValid = true;
      Object.keys(fields).forEach((fieldId) => {
        if (!validateField(fieldId)) {
          isValid = false;
        }
      });
      saveButton.disabled = !isValid;
      return isValid;
    };

    // Add event listeners to all fields
    Object.keys(fields).forEach((fieldId) => {
      const input = document.getElementById(fieldId);
      if (input) {
        input.addEventListener('input', () => validateAll());
        input.addEventListener('blur', () => validateField(fieldId));
      }
    });

    // Initial validation
    validateAll();
  }

  /**
   * Validates and saves citation metadata
   *
   * Performs comprehensive validation on all citation fields:
   * - Required fields (author, publication)
   * - Year range validation (1000-2100)
   * - Input length limits
   * - XSS prevention through sanitization
   *
   * Uses EditorJS notifier API for user-friendly error messages.
   */
  saveMetadata() {
    const author = document.getElementById('annotation-author').value.trim();
    const publication = document.getElementById('annotation-publication').value.trim();
    const year = document.getElementById('annotation-year').value.trim();
    const journal = document.getElementById('annotation-journal').value.trim();
    const volume = document.getElementById('annotation-volume').value.trim();
    const volumeInitialPage = document
      .getElementById('annotation-volume-initial-page')
      .value.trim();
    const volumeLastPage = document.getElementById('annotation-volume-last-page').value.trim();

    // Validate required fields
    if (!author || !publication) {
      this.api.notifier.show({
        message: 'Publication Title and Authors are required fields',
        style: 'error',
        time: 4000,
      });
      return;
    }

    // Validate author field length (max 500 chars)
    if (author.length > 500) {
      this.api.notifier.show({
        message: 'Authors field is too long (max 500 characters)',
        style: 'error',
        time: 4000,
      });
      return;
    }

    // Validate publication title length (max 500 chars)
    if (publication.length > 500) {
      this.api.notifier.show({
        message: 'Publication title is too long (max 500 characters)',
        style: 'error',
        time: 4000,
      });
      return;
    }

    // Validate year if provided
    if (year) {
      const yearNum = parseInt(year, 10);
      if (isNaN(yearNum) || yearNum < 1000 || yearNum > 2100) {
        this.api.notifier.show({
          message: 'Year must be between 1000 and 2100',
          style: 'error',
          time: 4000,
        });
        return;
      }
    }

    // Validate journal length (max 200 chars)
    if (journal && journal.length > 200) {
      this.api.notifier.show({
        message: 'Journal name is too long (max 200 characters)',
        style: 'error',
        time: 4000,
      });
      return;
    }

    // Validate volume and page numbers
    if (volume && volume.length > 50) {
      this.api.notifier.show({
        message: 'Volume is too long (max 50 characters)',
        style: 'error',
        time: 4000,
      });
      return;
    }

    if (volumeInitialPage && volumeInitialPage.length > 20) {
      this.api.notifier.show({
        message: 'Initial page is too long (max 20 characters)',
        style: 'error',
        time: 4000,
      });
      return;
    }

    if (volumeLastPage && volumeLastPage.length > 20) {
      this.api.notifier.show({
        message: 'Last page is too long (max 20 characters)',
        style: 'error',
        time: 4000,
      });
      return;
    }

    // Sanitize inputs to prevent XSS (basic HTML entity encoding)
    const sanitize = (str) => {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    };

    // All validations passed - save metadata
    if (this.currentWrapper) {
      this.currentWrapper.setAttribute('data-author', sanitize(author));
      this.currentWrapper.setAttribute('data-year', sanitize(year));
      this.currentWrapper.setAttribute('data-publication', sanitize(publication));
      this.currentWrapper.setAttribute('data-journal', sanitize(journal));
      this.currentWrapper.setAttribute('data-volume', sanitize(volume));
      this.currentWrapper.setAttribute('data-volume-initial-page', sanitize(volumeInitialPage));
      this.currentWrapper.setAttribute('data-volume-last-page', sanitize(volumeLastPage));
    }

    this.saved = true;
    this.closeOverlay();
  }

  closeOverlay() {
    document.body.removeEventListener('click', this.closeOverlayOnBodyClick);
    document.querySelectorAll('div.annotation-overlay').forEach((overlay) => {
      // Disconnect ResizeObserver to prevent memory leaks
      if (overlay.resizeObserver) {
        overlay.resizeObserver.disconnect();
        delete overlay.resizeObserver;
      }
      overlay.remove();
    });
    if (
      !this.saved &&
      this.currentWrapper &&
      !this.currentWrapper.getAttribute('data-author') &&
      !this.currentWrapper.getAttribute('data-year') &&
      !this.currentWrapper.getAttribute('data-publication') &&
      !this.currentWrapper.getAttribute('data-journal') &&
      !this.currentWrapper.getAttribute('data-volume') &&
      !this.currentWrapper.getAttribute('data-volume-initial-page') &&
      !this.currentWrapper.getAttribute('data-volume-last-page')
    ) {
      this.removeWrapper();
    }

    this.replaceAnnotationsWithReferences();

    this.currentWrapper = null;
  }

  removeWrapper() {
    if (this.currentWrapper) {
      const parent = this.currentWrapper.parentNode;
      const content = this.currentWrapper.getAttribute('data-publication')
        ? document.createTextNode(this.currentWrapper.getAttribute('data-publication'))
        : this.currentWrapper.firstChild?.nodeType === Node.TEXT_NODE
          ? this.currentWrapper.firstChild
          : '';
      parent.insertBefore(content, this.currentWrapper);

      this.currentWrapper.remove();
    }
  }

  addEventListeners(wrapper) {
    if (wrapper) {
      const eventListenerExists = !!wrapper.getAttribute(AnnotationTool.EVENT_LISTENER);
      if (!eventListenerExists) {
        wrapper.addEventListener('click', (e) => {
          this.stopEventPropagation(e);
          this.editAnnotation(wrapper);
        });
        wrapper.setAttribute(AnnotationTool.EVENT_LISTENER, 'true');
      }
    }
  }

  addEventListenersToAll() {
    document.querySelectorAll(this.tag).forEach((annotationTag) => {
      this.addEventListeners(annotationTag);
    });
  }

  editAnnotation(wrapper) {
    this.currentWrapper = wrapper;
    this.showOverlay();
  }

  replaceAnnotationsWithReferences() {
    const annotations = document.querySelectorAll(`${this.tag}.${AnnotationTool.CSS}`);
    const referenceMap = new Map();
    let currentIndex = 1;

    annotations.forEach((annotation) => {
      const publication = annotation.getAttribute('data-publication');
      const author = annotation.getAttribute('data-author');
      const uniqueKey = `${publication}|${author}`;

      if (!referenceMap.has(uniqueKey)) {
        referenceMap.set(uniqueKey, currentIndex);
        currentIndex++;
      }

      const referenceIndex = referenceMap.get(uniqueKey);
      annotation.innerHTML = `[${referenceIndex}]`;
    });
  }

  repositionEquationArea(target, overlay) {
    this.config.repositionOverlay?.(target, overlay) ??
      this.repositionOverlay(target, overlay, this.config.bufferSpacing ?? 0);
  }

  repositionOverlay(target, overlay, bufferSpacing) {
    const overlayRect = overlay.getBoundingClientRect();
    const overlayHeight = overlayRect.height;
    const targetRect = target.getBoundingClientRect();
    const spacing = 10;

    // Calculate available space
    const spaceAbove = targetRect.top;
    const spaceBelow = window.innerHeight - targetRect.bottom;

    // Decide position and height
    let top;
    let maxHeight;
    if (spaceBelow >= overlayHeight || spaceBelow >= spaceAbove) {
      // Position below
      top = targetRect.height + spacing;
      maxHeight = spaceBelow - spacing - bufferSpacing;
    } else {
      // Position above
      maxHeight = spaceAbove - spacing - bufferSpacing;
      top = -Math.min(overlayHeight, maxHeight) - spacing;
    }

    overlay.style.top = `${top}px`;
    overlay.style.maxHeight = `${maxHeight}px`;
  }

  /**
   * Observes overlay size changes and repositions accordingly
   * Handles:
   * - Validation errors appearing/disappearing (height changes)
   * - Window resize events
   * - Content expansion/collapse
   */
  observeOverlayResize(target, overlay) {
    const resizeObserver = new ResizeObserver(() => {
      this.repositionEquationArea(target, overlay);
    });

    // Watch both the overlay AND the target (annotation wrapper)
    // So popup stays anchored if annotation text wraps/changes height
    resizeObserver.observe(overlay);
    resizeObserver.observe(target);

    // Store observer to disconnect later
    overlay.resizeObserver = resizeObserver;
  }
}

export default AnnotationTool;
