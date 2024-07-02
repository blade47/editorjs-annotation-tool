import './index.css';

class AnnotationTool {
  static get isInline() {
    return true;
  }

  static get sanitize() {
    return {
      span: {
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
      },
    };
  }

  constructor({ api }) {
    this.api = api;
    this.button = null;
    this.modal = null;
    this.range = null;
    this.currentSpan = null;
    this.saved = false;

    this.addEventListenerToSpans();
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
    const span = document.createElement('span');
    span.appendChild(selectedText);
    span.classList.add('annotation');
    span.setAttribute('contenteditable', 'false');
    this.addEventListenerToSpan(span);

    this.range.insertNode(span);
    this.api.selection.expandToTag(span);
    this.currentSpan = span;
  }

  checkState() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const parent = selection.anchorNode.parentElement;
    this.button.classList.toggle(
      'ce-inline-tool--active',
      parent && parent.closest('span.annotation')
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
        'Authors (Lastname, Firstname initials, separated by comma) <input class="cdx-input" type="text" id="annotation-author">'
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

  populateSpanData() {
    if (this.currentSpan) {
      document.getElementById('annotation-author').value =
        this.currentSpan.getAttribute('data-author') || '';
      document.getElementById('annotation-year').value =
        this.currentSpan.getAttribute('data-year') || '';
      document.getElementById('annotation-publication').value =
        this.currentSpan.getAttribute('data-publication') || this.currentSpan.textContent;
      document.getElementById('annotation-journal').value =
        this.currentSpan.getAttribute('data-journal') || '';
      document.getElementById('annotation-volume').value =
        this.currentSpan.getAttribute('data-volume') || '';
      document.getElementById('annotation-volume-initial-page').value =
        this.currentSpan.getAttribute('data-volume-initial-page') || '';
      document.getElementById('annotation-volume-last-page').value =
        this.currentSpan.getAttribute('data-volume-last-page') || '';
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
    this.populateSpanData();

    const publicationInput = document.getElementById('annotation-publication');
    publicationInput.addEventListener('input', this.updateText.bind(this));
  }

  updateText(event) {
    const newText = event.target.value;

    if (this.currentSpan) {
      this.currentSpan.textContent = newText;
    } else if (this.range) {
      const span = document.createElement('span');
      span.textContent = newText;
      span.classList.add('annotation');

      this.range.deleteContents();
      this.range.insertNode(span);
      this.currentSpan = span;
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

    if (this.currentSpan) {
      this.currentSpan.setAttribute('data-author', author);
      this.currentSpan.setAttribute('data-year', year);
      this.currentSpan.setAttribute('data-publication', publication);
      this.currentSpan.setAttribute('data-journal', journal);
      this.currentSpan.setAttribute('data-volume', volume);
      this.currentSpan.setAttribute('data-volume-initial-page', volumeInitialPage);
      this.currentSpan.setAttribute('data-volume-last-page', volumeLastPage);
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
      this.currentSpan &&
      !this.currentSpan.getAttribute('data-author') &&
      !this.currentSpan.getAttribute('data-year') &&
      !this.currentSpan.getAttribute('data-publication') &&
      !this.currentSpan.getAttribute('data-journal') &&
      !this.currentSpan.getAttribute('data-volume') &&
      !this.currentSpan.getAttribute('data-volume-initial-page') &&
      !this.currentSpan.getAttribute('data-volume-last-page')
    ) {
      this.removeSpan();
    }

    this.range = null;
    this.currentSpan = null;
  }

  removeSpan() {
    if (this.currentSpan) {
      const parent = this.currentSpan.parentNode;
      while (this.currentSpan.firstChild) {
        parent.insertBefore(this.currentSpan.firstChild, this.currentSpan);
      }
      parent.removeChild(this.currentSpan);
    }
  }

  addEventListenerToSpan(span) {
    if (span) {
      const eventListenerExists = !!span.getAttribute('data-event-listener-added');
      if (!eventListenerExists) {
        span.addEventListener('click', () => this.editAnnotation(span));
        span.setAttribute('data-event-listener-added', 'true');
      }
    }
  }

  addEventListenerToSpans() {
    const spans = document.querySelectorAll('span.annotation');
    spans.forEach((span) => {
      this.addEventListenerToSpan(span);
    });
  }

  editAnnotation(span) {
    this.currentSpan = span;
    this.showModal();
  }
}

export default AnnotationTool;
