/**
=========================================================
* Soft UI Dashboard React - v4.0.1
=========================================================

* Product Page: https://www.creative-tim.com/product/soft-ui-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

// react-router components
import { Link } from "react-router-dom";

// prop-types is a library for typechecking of props
import PropTypes from "prop-types";

// @mui material components
import Card from "@mui/material/Card";
import MuiLink from "@mui/material/Link";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftAvatar from "components/SoftAvatar";
function DefaultBlogCard({
  image,
  category,
  title,
  description,
  author,
  action
}) {
  return /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(SoftBox, {
    mt: 2,
    mx: 2
  }, action.type === "internal" ? /*#__PURE__*/React.createElement(Link, {
    to: action.route
  }, /*#__PURE__*/React.createElement(SoftBox, {
    component: "img",
    src: image,
    alt: title,
    width: "100%",
    borderRadius: "lg"
  })) : /*#__PURE__*/React.createElement(MuiLink, {
    href: action.route,
    target: "_blank",
    rel: "noreferrer"
  }, /*#__PURE__*/React.createElement(SoftBox, {
    component: "img",
    src: image,
    alt: title,
    width: "100%",
    borderRadius: "lg"
  }))), /*#__PURE__*/React.createElement(SoftBox, {
    pb: 3,
    px: 3
  }, category && /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "caption",
    color: category.color,
    textTransform: "uppercase",
    fontWeight: "medium",
    textGradient: true
  }, category.label), /*#__PURE__*/React.createElement(SoftBox, {
    display: "block",
    mt: 0.5,
    mb: 1
  }, action.type === "internal" ? /*#__PURE__*/React.createElement(Link, {
    to: action.route
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    display: "inline",
    variant: "h5",
    textTransform: "capitalize",
    className: "color-background"
  }, title)) : /*#__PURE__*/React.createElement(MuiLink, {
    href: action.route,
    target: "_blank",
    rel: "noreferrer"
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    display: "inline",
    variant: "h5",
    textTransform: "capitalize",
    className: "color-background"
  }, title))), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "body2",
    component: "p",
    color: "text"
  }, description), author && /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    alignItems: "center",
    mt: 3
  }, /*#__PURE__*/React.createElement(SoftAvatar, {
    variant: "rounded",
    src: author.image,
    alt: author.name,
    shadow: "md"
  }), /*#__PURE__*/React.createElement(SoftBox, {
    pl: 2,
    lineHeight: 0
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    component: "h6",
    variant: "button",
    fontWeight: "medium",
    gutterBottom: true
  }, author.name), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "caption",
    color: "text"
  }, author.date)))));
}

// Setting default props for the DefaultBlogCard
DefaultBlogCard.defaultProps = {
  category: false,
  author: false
};

// Typechecking props for the DefaultBlogCard
DefaultBlogCard.propTypes = {
  image: PropTypes.string.isRequired,
  category: PropTypes.oneOfType([PropTypes.shape({
    color: PropTypes.oneOf(["primary", "secondary", "info", "success", "warning", "error", "dark"]).isRequired,
    label: PropTypes.string.isRequired
  }), PropTypes.bool]),
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  author: PropTypes.oneOfType([PropTypes.shape({
    image: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    date: PropTypes.oneOfType([PropTypes.string, PropTypes.func]).isRequired
  }), PropTypes.bool]),
  action: PropTypes.shape({
    type: PropTypes.oneOf(["external", "internal"]).isRequired,
    route: PropTypes.string.isRequired
  }).isRequired
};
export default DefaultBlogCard;