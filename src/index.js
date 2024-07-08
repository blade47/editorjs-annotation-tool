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
    this.modal = null;
    this.range = null;
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
    this.button.addEventListener(
      'click',
      () => {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          this.range = selection.getRangeAt(0);
          this.showModal();
        }
      },
      false
    );

    return this.button;
  }

  surround() {
    if (!this.range) {
      return;
    }

    const selectedText = this.range.extractContents();

    const wrapper = document.createElement(this.tag);
    wrapper.appendChild(selectedText);
    wrapper.classList.add(AnnotationTool.CSS);
    wrapper.setAttribute('contenteditable', 'false');
    this.addEventListeners(wrapper);

    this.range.insertNode(wrapper);
    this.api.selection.expandToTag(wrapper);
    this.currentWrapper = wrapper;
  }

  checkState() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const parent = selection.anchorNode.parentElement;
    this.button.classList.toggle(
      'ce-inline-tool--active',
      parent && parent.closest(AnnotationTool.CSS)
    );
  }

  generateLabelElement(html) {
    const label = document.createElement('label');
    label.innerHTML = html;
    return label;
  }

  generateModal() {
    this.modal = document.createElement('div');
    this.modal.classList.add('annotation-modal-overlay');

    const divModal = document.createElement('div');
    divModal.classList.add('annotation-modal');

    const closeButton = document.createElement('button');
    closeButton.classList.add('annotation-modal-button-close');
    closeButton.id = 'annotation-cancel';
    closeButton.innerText = '✖';

    const saveButton = document.createElement('button');
    saveButton.classList.add('annotation-modal-button');
    saveButton.id = 'annotation-save';
    saveButton.innerText = 'Save';

    this.modal.appendChild(divModal);

    divModal.appendChild(closeButton);
    divModal.appendChild(
      this.generateLabelElement(
        'Publication Title <input class="cdx-input" type="text" id="annotation-publication">'
      )
    );
    divModal.appendChild(
      this.generateLabelElement(
        'Authors (new authors separated by comma, e.g. Doe J., Smith J.) <input class="cdx-input" type="text" id="annotation-author">'
      )
    );
    divModal.appendChild(
      this.generateLabelElement(
        'Year of Publication <input class="cdx-input" type="text" id="annotation-year">'
      )
    );
    divModal.appendChild(
      this.generateLabelElement(
        'Journal Name (abbreviated) <input class="cdx-input" type="text" id="annotation-journal">'
      )
    );
    divModal.appendChild(
      this.generateLabelElement(
        'Volume <input class="cdx-input" type="text" id="annotation-volume">'
      )
    );
    divModal.appendChild(
      this.generateLabelElement(
        'Initial Page <input class="cdx-input" type="text" id="annotation-volume-initial-page">'
      )
    );
    divModal.appendChild(
      this.generateLabelElement(
        'Last Page <input class="cdx-input" type="text" id="annotation-volume-last-page">'
      )
    );
    divModal.appendChild(saveButton);

    document.body.appendChild(this.modal);

    this.modal.style.pointerEvents = 'auto';

    saveButton.addEventListener('click', () => {
      this.saveMetadata();
    });

    closeButton.addEventListener('click', () => {
      this.closeModal();
    });
  }

  populateWrapperData() {
    if (this.currentWrapper) {
      document.getElementById('annotation-author').value =
        this.currentWrapper.getAttribute('data-author') || '';
      document.getElementById('annotation-year').value =
        this.currentWrapper.getAttribute('data-year') || '';
      document.getElementById('annotation-publication').value =
        this.currentWrapper.getAttribute('data-publication') || this.currentWrapper.textContent;
      document.getElementById('annotation-journal').value =
        this.currentWrapper.getAttribute('data-journal') || '';
      document.getElementById('annotation-volume').value =
        this.currentWrapper.getAttribute('data-volume') || '';
      document.getElementById('annotation-volume-initial-page').value =
        this.currentWrapper.getAttribute('data-volume-initial-page') || '';
      document.getElementById('annotation-volume-last-page').value =
        this.currentWrapper.getAttribute('data-volume-last-page') || '';
    } else if (this.range) {
      document.getElementById('annotation-publication').value = this.range.toString();
    }
  }

  showModal() {
    if (document.querySelector('.annotation-modal-overlay')) {
      return;
    }
    this.saved = false;

    this.generateModal();
    this.populateWrapperData();

    const publicationInput = document.getElementById('annotation-publication');
    publicationInput.addEventListener('input', this.updateText.bind(this));
  }

  updateText(event) {
    const newText = event.target.value;

    if (this.currentWrapper) {
      this.currentWrapper.textContent = newText;
    } else if (this.range) {
      const wrapper = document.createElement(this.tag);
      wrapper.textContent = newText;
      wrapper.classList.add(AnnotationTool.CSS);

      this.range.deleteContents();
      this.range.insertNode(wrapper);
      this.currentWrapper = wrapper;
    }
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
    this.closeModal();
  }

  closeModal() {
    if (this.modal) {
      document.body.removeChild(this.modal);
      this.modal = null;
    }

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
    this.range = null;
    this.currentWrapper = null;
  }

  removeWrapper() {
    if (this.currentWrapper) {
      const parent = this.currentWrapper.parentNode;
      while (this.currentWrapper.firstChild) {
        parent.insertBefore(this.currentWrapper.firstChild, this.currentWrapper);
      }
      parent.removeChild(this.currentWrapper);
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
    this.showModal();
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
