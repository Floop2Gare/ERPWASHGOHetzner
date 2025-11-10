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

// react-router-dom components
import { Link } from "react-router-dom";

// prop-types is a library for typechecking of props
import PropTypes from "prop-types";

// @mui material components
import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import Tooltip from "@mui/material/Tooltip";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftButton from "components/SoftButton";
import SoftAvatar from "components/SoftAvatar";
function DefaultProjectCard({
  image,
  label,
  title,
  description,
  action,
  authors
}) {
  const renderAuthors = authors.map(({
    image: media,
    name
  }) => /*#__PURE__*/React.createElement(Tooltip, {
    key: name,
    title: name,
    placement: "bottom"
  }, /*#__PURE__*/React.createElement(SoftAvatar, {
    src: media,
    alt: name,
    size: "xs",
    sx: ({
      borders: {
        borderWidth
      },
      palette: {
        white
      }
    }) => ({
      border: `${borderWidth[2]} solid ${white.main}`,
      cursor: "pointer",
      position: "relative",
      ml: -1.25,
      "&:hover, &:focus": {
        zIndex: "10"
      }
    })
  })));
  return /*#__PURE__*/React.createElement(Card, {
    sx: {
      display: "flex",
      flexDirection: "column",
      backgroundColor: "transparent",
      boxShadow: "none",
      overflow: "visible"
    }
  }, /*#__PURE__*/React.createElement(SoftBox, {
    position: "relative",
    width: "100.25%",
    shadow: "xl",
    borderRadius: "xl"
  }, /*#__PURE__*/React.createElement(CardMedia, {
    src: image,
    component: "img",
    title: title,
    sx: {
      maxWidth: "100%",
      margin: 0,
      boxShadow: ({
        boxShadows: {
          md
        }
      }) => md,
      objectFit: "cover",
      objectPosition: "center"
    }
  })), /*#__PURE__*/React.createElement(SoftBox, {
    pt: 3,
    px: 0.5
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mb: 1
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    fontWeight: "regular",
    textTransform: "capitalize",
    textGradient: true
  }, label)), /*#__PURE__*/React.createElement(SoftBox, {
    mb: 1
  }, action.type === "internal" ? /*#__PURE__*/React.createElement(SoftTypography, {
    component: Link,
    to: action.route,
    variant: "h5",
    textTransform: "capitalize"
  }, title) : /*#__PURE__*/React.createElement(SoftTypography, {
    component: "a",
    href: action.route,
    target: "_blank",
    rel: "noreferrer",
    variant: "h5",
    textTransform: "capitalize"
  }, title)), /*#__PURE__*/React.createElement(SoftBox, {
    mb: 3,
    lineHeight: 0
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    fontWeight: "regular",
    color: "text"
  }, description)), /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  }, action.type === "internal" ? /*#__PURE__*/React.createElement(SoftButton, {
    component: Link,
    to: action.route,
    variant: "outlined",
    size: "small",
    color: action.color
  }, action.label) : /*#__PURE__*/React.createElement(SoftButton, {
    component: "a",
    href: action.route,
    target: "_blank",
    rel: "noreferrer",
    variant: "outlined",
    size: "small",
    color: action.color
  }, action.label), /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex"
  }, renderAuthors))));
}

// Setting default values for the props of DefaultProjectCard
DefaultProjectCard.defaultProps = {
  authors: []
};

// Typechecking props for the DefaultProjectCard
DefaultProjectCard.propTypes = {
  image: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  action: PropTypes.shape({
    type: PropTypes.oneOf(["external", "internal"]),
    route: PropTypes.string.isRequired,
    color: PropTypes.oneOf(["primary", "secondary", "info", "success", "warning", "error", "light", "dark", "white"]).isRequired,
    label: PropTypes.string.isRequired
  }).isRequired,
  authors: PropTypes.arrayOf(PropTypes.object)
};
export default DefaultProjectCard;