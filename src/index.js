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

  constructor({ api }) {
    this.api = api;
    this.button = null;
    this.currentWrapper = null;
    this.saved = false;

    this.tag = 'ANNOTATION';
    this.addEventListenersToAll();
    this.observeAnnotationDeletion();
  }

  render() {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.classList.add('ce-inline-tool', 'ce-inline-tool-annotation');

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

  generateLabelElement(labelText, inputId, index, type = 'text') {
    const label = document.createElement('label');
    label.innerText = labelText;
    const input = document.createElement('input');
    input.setAttribute('id', inputId);
    input.setAttribute('type', type);
    input.classList.add('cdx-input');
    label.setAttribute('for', inputId);

    // label.appendChild(input);
    return [label, input];
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
    overlay.append(...this.generateLabelElement('Publication Title', 'annotation-publication', 1));
    overlay.append(
      ...this.generateLabelElement(
        'Authors (new authors separated by comma, e.g. Doe J., Smith J.)',
        'annotation-author',
        2
      )
    );
    overlay.append(
      ...this.generateLabelElement('Year of Publication', 'annotation-year', 3, 'number')
    );
    overlay.append(
      ...this.generateLabelElement('Journal Name (abbreviated)', 'annotation-journal', 4)
    );
    overlay.append(...this.generateLabelElement('Volume', 'annotation-volume', 5));
    overlay.append(
      ...this.generateLabelElement('Initial Page', 'annotation-volume-initial-page', 6)
    );
    overlay.append(...this.generateLabelElement('Last Page', 'annotation-volume-last-page', 7));
    overlay.appendChild(buttonsWrapper);

    const wrapper = this.api.selection.findParentTag(this.tag);

    wrapper.appendChild(overlay);
    // overlay.style.pointerEvents = 'auto';

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

    overlay.addEventListener('click', this.stopEventPropagation);
  }

  stopEventPropagation(event) {
    event.preventDefault();
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

  saveMetadata() {
    const author = document.getElementById('annotation-author').value;
    const publication = document.getElementById('annotation-publication').value;

    if (!author.trim() || !publication.trim()) {
      alert('Publication Title and Authors are required fields.');
      return;
    }

    const year = document.getElementById('annotation-year').value;
    const journal = document.getElementById('annotation-journal').value;

    const volume = document.getElementById('annotation-volume').value;
    const volumeInitialPage = document.getElementById('annotation-volume-initial-page').value;
    const volumeLastPage = document.getElementById('annotation-volume-last-page').value;

    if (this.currentWrapper) {
      this.currentWrapper.setAttribute('data-author', author);
      this.currentWrapper.setAttribute('data-year', year);
      this.currentWrapper.setAttribute('data-publication', publication);
      this.currentWrapper.setAttribute('data-journal', journal);
      this.currentWrapper.setAttribute('data-volume', volume);
      this.currentWrapper.setAttribute('data-volume-initial-page', volumeInitialPage);
      this.currentWrapper.setAttribute('data-volume-last-page', volumeLastPage);
    }

    this.saved = true;
    this.closeOverlay();
  }

  closeOverlay() {
    document.querySelectorAll('div.annotation-overlay').forEach((overlay) => {
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
        wrapper.addEventListener('click', () => this.editAnnotation(wrapper));
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

  observeAnnotationDeletion() {
    const observer = new MutationObserver((mutations) => {
      let annotationRemoved = false;
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains(AnnotationTool.CSS)) {
            annotationRemoved = true;
          }
        });
      });

      if (annotationRemoved) {
        this.replaceAnnotationsWithReferences();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }
}

export default AnnotationTool;
