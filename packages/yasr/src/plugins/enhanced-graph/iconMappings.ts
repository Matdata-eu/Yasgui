/**
 * Default mappings from RDF predicate IRIs to FontAwesome icon names
 * Users can override these via plugin configuration
 */

// FontAwesome icon imports
import * as faTag from "@fortawesome/free-solid-svg-icons/faTag";
import * as faFont from "@fortawesome/free-solid-svg-icons/faFont";
import * as faComment from "@fortawesome/free-solid-svg-icons/faComment";
import * as faUsers from "@fortawesome/free-solid-svg-icons/faUsers";
import * as faIdCard from "@fortawesome/free-solid-svg-icons/faIdCard";
import * as faHome from "@fortawesome/free-solid-svg-icons/faHome";
import * as faUser from "@fortawesome/free-solid-svg-icons/faUser";
import * as faCalendar from "@fortawesome/free-solid-svg-icons/faCalendar";
import * as faHeading from "@fortawesome/free-solid-svg-icons/faHeading";
import * as faUserEdit from "@fortawesome/free-solid-svg-icons/faUserEdit";
import * as faLink from "@fortawesome/free-solid-svg-icons/faLink";
import * as faArrowRight from "@fortawesome/free-solid-svg-icons/faArrowRight";
import * as faBook from "@fortawesome/free-solid-svg-icons/faBook";
import * as faGlobe from "@fortawesome/free-solid-svg-icons/faGlobe";
import * as faEnvelope from "@fortawesome/free-solid-svg-icons/faEnvelope";
import * as faImage from "@fortawesome/free-solid-svg-icons/faImage";

/**
 * Default predicate-to-icon mappings
 */
export const DEFAULT_ICON_MAP: Record<string, string> = {
  // RDF/RDFS
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#type": "faTag",
  "http://www.w3.org/2000/01/rdf-schema#label": "faFont",
  "http://www.w3.org/2000/01/rdf-schema#comment": "faComment",
  "http://www.w3.org/2000/01/rdf-schema#seeAlso": "faLink",
  "http://www.w3.org/2000/01/rdf-schema#isDefinedBy": "faBook",

  // FOAF (Friend of a Friend)
  "http://xmlns.com/foaf/0.1/knows": "faUsers",
  "http://xmlns.com/foaf/0.1/name": "faIdCard",
  "http://xmlns.com/foaf/0.1/homepage": "faHome",
  "http://xmlns.com/foaf/0.1/mbox": "faEnvelope",
  "http://xmlns.com/foaf/0.1/depiction": "faImage",
  "http://xmlns.com/foaf/0.1/page": "faGlobe",

  // Dublin Core
  "http://purl.org/dc/terms/creator": "faUser",
  "http://purl.org/dc/terms/created": "faCalendar",
  "http://purl.org/dc/terms/title": "faHeading",
  "http://purl.org/dc/terms/description": "faComment",
  "http://purl.org/dc/elements/1.1/creator": "faUser",
  "http://purl.org/dc/elements/1.1/date": "faCalendar",
  "http://purl.org/dc/elements/1.1/title": "faHeading",

  // Schema.org
  "http://schema.org/author": "faUserEdit",
  "http://schema.org/url": "faLink",
  "http://schema.org/name": "faIdCard",
  "http://schema.org/email": "faEnvelope",
  "http://schema.org/image": "faImage",

  // OWL
  "http://www.w3.org/2002/07/owl#sameAs": "faLink",

  // Default fallback
  default: "faArrowRight",
};

/**
 * FontAwesome icon definitions map
 */
export const ICON_DEFINITIONS: Record<string, any> = {
  faTag,
  faFont,
  faComment,
  faUsers,
  faIdCard,
  faHome,
  faUser,
  faCalendar,
  faHeading,
  faUserEdit,
  faLink,
  faArrowRight,
  faBook,
  faGlobe,
  faEnvelope,
  faImage,
};

/**
 * Get the FontAwesome icon for a predicate IRI
 */
export function getIconForPredicate(predicateIri: string, customMappings?: Record<string, string>): string {
  // Check custom mappings first
  if (customMappings && customMappings[predicateIri]) {
    return customMappings[predicateIri];
  }

  // Check default mappings
  if (DEFAULT_ICON_MAP[predicateIri]) {
    return DEFAULT_ICON_MAP[predicateIri];
  }

  // Return default fallback
  return DEFAULT_ICON_MAP.default;
}

/**
 * Get the FontAwesome icon definition object
 */
export function getIconDefinition(iconName: string): any {
  return ICON_DEFINITIONS[iconName] || ICON_DEFINITIONS.faArrowRight;
}
