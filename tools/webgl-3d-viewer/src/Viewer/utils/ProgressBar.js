import template from 'lodash/string/template';
import merge from 'lodash/object/merge';
import each from 'lodash/collection/each';

export default class ProgressBar {

  constructor(domElm, config = {}) {

    this._container = domElm;
    this._progressElm = null;

    this._defaultConfig = {
      visibility: 'hidden',
      progress: 0,
      unit: '%',
      text: 'Preview ',
      progressText: 'Preview'
    };

    this.template = template(`
      <div class="viewer__progress-bar viewer__progress-bar--<%- visibility %>">
        <div class="viewer__progress-bar__container">
          <% if(progress > 0) { %>
            <span class="viewer__progress-bar__text"><%- text %></span>
            <span class="viewer__progress-bar__count"><%- progress %></span>
            <span class="viewer__progress-bar__unit"><%- unit %></span>
          <% } else { %>
            <span class="viewer__progress-bar__text"><%- progressText %></span>
          <% } %>
        </div>
      </div>
    `.trim());

    this._config = merge({}, this._defaultConfig, config);
    this._updateProgress();
  }

  show() {
    this._config.visibility = 'visible';
    if (this._progressElm.classList) {
      this._progressElm.classList.remove('viewer__progress-bar--hidden');
      this._progressElm.classList.add('viewer__progress-bar--visible');
    } else {
      this._updateProgress();
    }
  }

  hide() {
    this._config.visibility = 'hidden';

    if (this._progressElm.classList) {
      this._progressElm.classList.add('viewer__progress-bar--hidden');
      this._progressElm.classList.remove('viewer__progress-bar--visible');
    } else {
      this._updateProgress();
    }
  }

  _updateProgress() {

    let elm = this.template(this._config);
    let domNodes = this._container.getElementsByClassName('viewer__progress-bar');

    if (domNodes.length > 0) {

      each(domNodes, (node)=>{
        if (node) {
          node.remove();
        }
      });

      this._progressElm = null;
    }

    let el = document.createElement('div');
    el.innerHTML = elm;

    this._container.appendChild(el.childNodes[0]);
    this._progressElm = elm;
  }

  set progress(progress) {

    if (progress) {
      this._config.progress = parseInt(progress, 10);
      this._updateProgress();
    }
  }

  get progress() {
    return this._config.progress;
  }

  destroy() {

    let domElms = this._container.getElementsByClassName('viewer__progress-bar');

    each(domElms, (node)=>{
      node.remove();
    });
  }
}
