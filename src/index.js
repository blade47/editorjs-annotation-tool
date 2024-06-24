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
  }

  render() {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.classList.add('ce-inline-tool', 'ce-inline-tool-annotation');
    this.button.addEventListener('click', () => {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        this.range = selection.getRangeAt(0);
        this.showModal();
      }
    });

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
    this.currentSpan = span; // Set the currentSpan for the first time
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

  showModal() {
    if (document.querySelector('.annotation-modal-overlay')) {
      return;
    }
    this.saved = false;
    this.modal = document.createElement('div');
    this.modal.classList.add('annotation-modal-overlay');
    this.modal.innerHTML = `
      <div class="annotation-modal">
        <label>
          Name of the Publication:
          <input type="text" id="annotation-publication">
        </label>
        <label>
          Authors (comma-separated):
          <input type="text" id="annotation-author">
        </label>
        <label>
          Year of Publication:
          <input type="text" id="annotation-year">
        </label>
        <label>
          Journal:
          <input type="text" id="annotation-journal">
        </label>
        <button id="annotation-save">Save</button>
        <button id="annotation-cancel">Cancel</button>
      </div>
    `;

    document.body.appendChild(this.modal);
    document.body.classList.add('unclickable-annotation-modal-open'); // Make the rest of the page unclickable
    this.modal.style.pointerEvents = 'auto'; // Ensure modal and its contents are clickable

    if (this.currentSpan) {
      document.getElementById('annotation-author').value =
        this.currentSpan.getAttribute('data-author') || '';
      document.getElementById('annotation-year').value =
        this.currentSpan.getAttribute('data-year') || '';
      document.getElementById('annotation-publication').value =
        this.currentSpan.getAttribute('data-publication') || this.currentSpan.textContent;
      document.getElementById('annotation-journal').value =
        this.currentSpan.getAttribute('data-journal') || '';
    } else if (this.range) {
      document.getElementById('annotation-publication').value = this.range.toString();
    }

    const publicationInput = document.getElementById('annotation-publication');
    publicationInput.addEventListener('input', this.updateText.bind(this));

    document.getElementById('annotation-save').addEventListener('click', () => {
      this.saveMetadata();
    });

    document.getElementById('annotation-cancel').addEventListener('click', () => {
      this.closeModal();
    });
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
      alert('Author and Name of the Publication are required fields.');
      return;
    }

    const year = document.getElementById('annotation-year').value;
    const journal = document.getElementById('annotation-journal').value;

    if (this.currentSpan) {
      this.currentSpan.setAttribute('data-author', author);
      this.currentSpan.setAttribute('data-year', year);
      this.currentSpan.setAttribute('data-publication', publication);
      this.currentSpan.setAttribute('data-journal', journal);
    }

    this.saved = true;
    this.closeModal();
  }

  closeModal() {
    if (this.modal) {
      document.body.removeChild(this.modal);
      this.modal = null;
    }
    document.body.classList.remove('unclickable-annotation-modal-open'); // Make the rest of the page clickable again

    if (
      !this.saved &&
      this.currentSpan &&
      !this.currentSpan.getAttribute('data-author') &&
      !this.currentSpan.getAttribute('data-year') &&
      !this.currentSpan.getAttribute('data-publication') &&
      !this.currentSpan.getAttribute('data-journal')
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
