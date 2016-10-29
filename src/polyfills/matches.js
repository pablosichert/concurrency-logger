// https://developer.mozilla.org/en/docs/Web/API/Element/matches

export default Element => {
    if (!Element.prototype.matches) {
        Element.prototype.matches = (
            Element.prototype.matchesSelector ||
            Element.prototype.mozMatchesSelector ||
            Element.prototype.msMatchesSelector ||
            Element.prototype.oMatchesSelector ||
            Element.prototype.webkitMatchesSelector ||
            (selector => {
                const matches = ((this.document || this.ownerDocument)
                    .querySelectorAll(selector)
                );

                let i = matches.length;

                while (--i >= 0) {
                    if (matches.item(i) === this) {
                        break;
                    }
                }

                return i > -1;
            })
        );
    }
};
