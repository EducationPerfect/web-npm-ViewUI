// Thanks to: https://github.com/airyland/vux/blob/v2/src/directives/transfer-dom/index.js
// Thanks to: https://github.com/calebroseland/vue-dom-portal

import { nanoid } from "nanoid";
import Vue from "vue";

function createMfePortalElement(guid) {
    const mfeKey = Vue.prototype.$mfeKey;
    if (!mfeKey) {
        return null;
    }

    const portalId = getMfePortalId(guid);
    const newPortal = document.createElement("div");
    newPortal.id = portalId;
    newPortal.classList = [mfeKey];
    document.body.appendChild(newPortal);

    return newPortal;
}

function getMfePortalElement(guid) {
    const portalId = getMfePortalId(guid);
    return document.getElementById(portalId)
}

function getMfePortalId(guid) {
    return `mfe-portal-${guid}`;
}

/**
 * Get target DOM Node
 * @param {(Node|string|Boolean)} [node=document.body] DOM Node, CSS selector, or Boolean
 * @return {Node} The target that the el will be appended to
 */
function getTarget (node, guid) {
    if (node !== void 0 && node !== true) {
        return document.querySelector(node);
    }

    const mfeKey = Vue.prototype.$mfeKey;
    if (mfeKey && guid) {
        const portalElement = getMfePortalElement(guid);
        if (portalElement) {
            return portalElement;
        }

        return createMfePortalElement(guid);
    }
    
    return document.body;
}

const directive = {
    inserted (el, { value }, vnode) {
        if ( el.dataset && el.dataset.transfer !== 'true') return false;

        // Create a unique identifier so we can target individual body elements
        // if required.
        const guid = nanoid();
        el.dataset.guid = guid;

        el.className = el.className ? el.className + ' v-transfer-dom' : 'v-transfer-dom';
        const parentNode = el.parentNode;
        if (!parentNode) return;
        const home = document.createComment('');
        let hasMovedOut = false;

        if (value !== false) {
            parentNode.replaceChild(home, el); // moving out, el is no longer in the document
            getTarget(value, guid).appendChild(el); // moving into new place
            hasMovedOut = true
        }
        if (!el.__transferDomData) {
            el.__transferDomData = {
                parentNode: parentNode,
                home: home,
                target: getTarget(value, guid),
                hasMovedOut: hasMovedOut
            }
        }
    },
    componentUpdated (el, { value }) {
        if ( el.dataset && el.dataset.transfer !== 'true') return false;

        const guid = el.dataset.guid;
        // need to make sure children are done updating (vs. `update`)
        const ref$1 = el.__transferDomData;
        if (!ref$1) return;
        // homes.get(el)
        const parentNode = ref$1.parentNode;
        const home = ref$1.home;
        const hasMovedOut = ref$1.hasMovedOut; // recall where home is

        if (!hasMovedOut && value) {
            // remove from document and leave placeholder
            parentNode.replaceChild(home, el);
            // append to target
            getTarget(value, guid).appendChild(el);
            el.__transferDomData = Object.assign({}, el.__transferDomData, { hasMovedOut: true, target: getTarget(value, guid) });
        } else if (hasMovedOut && value === false) {
            // previously moved, coming back home
            parentNode.replaceChild(el, home);
            el.__transferDomData = Object.assign({}, el.__transferDomData, { hasMovedOut: false, target: getTarget(value, guid) });
        } else if (value) {
            // already moved, going somewhere else
            getTarget(value, guid).appendChild(el);
        }
    },
    unbind (el) {
        if (el.dataset && el.dataset.transfer !== 'true') return false;
        el.className = el.className.replace('v-transfer-dom', '');

        const portalElement = getMfePortalElement(el.dataset.guid);
        if (portalElement) {
            portalElement.remove();
        }

        const ref$1 = el.__transferDomData;
        if (!ref$1) return;
        if (el.__transferDomData.hasMovedOut === true) {
            el.__transferDomData.parentNode && el.__transferDomData.parentNode.appendChild(el)
        }
        el.__transferDomData = null
    }
};

export default directive;