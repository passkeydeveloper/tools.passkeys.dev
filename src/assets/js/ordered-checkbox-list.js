/**
 * @typedef {Object} OrderedCheckboxListItem
 * @property {string} value
 * @property {string} label
 */

/**
 * @typedef {Object} OrderChangeEventDetail
 * @property {string[]} value - The ordered array of currently-checked values.
 */

/**
 * Renders a list of checkboxes from `items`. Checking a box appends its value to the end
 * of the ordered `value` array; unchecking it removes it from wherever it sits.
 *
 * Renders into the light DOM so the page's Bootstrap styles (including dark mode) apply as-is.
 *
 * @element ordered-checkbox-list
 *
 * @fires {CustomEvent<OrderChangeEventDetail>} order-change - Fired after every check/uncheck.
 */
class OrderedCheckboxList extends HTMLElement {
    constructor() {
        super();
        /** @type {OrderedCheckboxListItem[]} */
        this._items = [];
        /** @type {string[]} */
        this._order = [];
    }

    /** @returns {void} */
    connectedCallback() {
        this._render();
    }

    /** @type {OrderedCheckboxListItem[]} */
    get items() {
        return this._items;
    }

    /**
     * @param {(OrderedCheckboxListItem | string)[]} newItems - Plain strings are normalized
     *   to `{ value: s, label: s }`. Re-renders, preserving checked state for values that
     *   still exist.
     */
    set items(newItems) {
        this._items = (newItems ?? []).map((item) =>
            typeof item === 'string' ? { value: item, label: item } : item
        );
        // Keep only still-existing values, preserving their relative order
        const validValues = new Set(this._items.map((item) => item.value));
        this._order = this._order.filter((value) => validValues.has(value));
        this._render();
    }

    /** @type {string[]} The ordered array of currently-checked values. */
    get value() {
        return [...this._order];
    }

    /**
     * @param {string[]} newValue - Reconciles which boxes are checked and their order (e.g.
     *   to restore state from a URL query param).
     */
    set value(newValue) {
        this._order = [...(newValue ?? [])];
        this._render();
    }

    /** @returns {void} */
    _render() {
        this.replaceChildren();

        this._items.forEach((item, index) => {
            const inputId = `${this._instanceId()}-${index}`;

            const wrapper = document.createElement('div');
            wrapper.className = 'form-check form-check-inline';

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.className = 'form-check-input';
            input.id = inputId;
            input.dataset.value = item.value;
            input.checked = this._order.includes(item.value);
            input.addEventListener('change', (event) => this._handleChange(event));

            const label = document.createElement('label');
            label.className = 'form-check-label';
            label.htmlFor = inputId;
            label.textContent = item.label;

            wrapper.append(input, label);
            this.append(wrapper);
        });
    }

    /**
     * @param {Event & { target: HTMLInputElement }} event
     * @returns {void}
     */
    _handleChange(event) {
        const value = event.target.dataset.value;

        if (event.target.checked) {
            this._order.push(value);
        } else {
            const index = this._order.indexOf(value);
            if (index >= 0) {
                this._order.splice(index, 1);
            }
        }

        this.dispatchEvent(
            new CustomEvent('order-change', {
                bubbles: true,
                detail: { value: [...this._order] },
            })
        );
    }

    /** @returns {string} */
    _instanceId() {
        if (!this._id) {
            this._id = this.id || `ordered-checkbox-list-${Math.random().toString(36).slice(2)}`;
        }
        return this._id;
    }
}

customElements.define('ordered-checkbox-list', OrderedCheckboxList);
