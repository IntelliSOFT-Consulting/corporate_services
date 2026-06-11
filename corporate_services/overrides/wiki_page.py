from bleach_allowlist import bleach_allowlist
from wiki.wiki.doctype.wiki_page.wiki_page import WikiPage

from frappe.utils.html_utils import (
    acceptable_attributes,
    acceptable_elements,
    is_json,
    mathml_elements,
    svg_attributes,
    svg_elements,
)


class CorporateServicesWikiPage(WikiPage):
    def sanitize_html(self):
        """
        Compatibility override for wiki's sanitizer on Bleach 6+.

        The upstream wiki app still passes ``styles=`` to ``bleach.clean``.
        Bleach 6 removed that argument in favor of ``css_sanitizer=``.
        """
        import bleach
        from bleach.css_sanitizer import CSSSanitizer
        from bs4 import BeautifulSoup

        html = self.content

        if is_json(html):
            return html

        if not bool(BeautifulSoup(html, "html.parser").find()):
            return html

        tags = (
            acceptable_elements
            + svg_elements
            + mathml_elements
            + ["html", "head", "meta", "link", "body", "style", "o:p", "iframe"]
        )

        def attributes_filter(tag, name, value):
            if name.startswith("data-"):
                return True
            return name in acceptable_attributes

        escaped_html = bleach.clean(
            html,
            tags=tags,
            attributes={"*": attributes_filter, "svg": svg_attributes},
            css_sanitizer=CSSSanitizer(allowed_css_properties=bleach_allowlist.all_styles),
            strip_comments=False,
            protocols=["cid", "http", "https", "mailto"],
        )

        soup = BeautifulSoup(escaped_html, "html.parser")
        for iframe in soup.find_all("iframe"):
            if "youtube.com/embed/" not in iframe.get("src", ""):
                iframe.replace_with(str(iframe))

        return str(soup)
