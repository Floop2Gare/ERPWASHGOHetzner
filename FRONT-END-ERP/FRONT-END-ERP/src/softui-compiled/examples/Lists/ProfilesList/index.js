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

// react-routers components
import { Link } from "react-router-dom";

// prop-types is library for typechecking of props
import PropTypes from "prop-types";

// @mui material components
import Card from "@mui/material/Card";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftAvatar from "components/SoftAvatar";
import SoftButton from "components/SoftButton";
function ProfilesList({
  title,
  profiles
}) {
  const renderProfiles = profiles.map(({
    image,
    name,
    description,
    action
  }) => /*#__PURE__*/React.createElement(SoftBox, {
    key: name,
    component: "li",
    display: "flex",
    alignItems: "center",
    py: 1,
    mb: 1
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mr: 2
  }, /*#__PURE__*/React.createElement(SoftAvatar, {
    src: image,
    alt: "something here",
    variant: "rounded",
    shadow: "md"
  })), /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center"
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    fontWeight: "medium"
  }, name), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "caption",
    color: "text"
  }, description)), /*#__PURE__*/React.createElement(SoftBox, {
    ml: "auto"
  }, action.type === "internal" ? /*#__PURE__*/React.createElement(SoftButton, {
    component: Link,
    to: action.route,
    variant: "text",
    color: "info"
  }, action.label) : /*#__PURE__*/React.createElement(SoftButton, {
    component: "a",
    href: action.route,
    target: "_blank",
    rel: "noreferrer",
    variant: "text",
    color: action.color
  }, action.label))));
  return /*#__PURE__*/React.createElement(Card, {
    sx: {
      height: "100%"
    }
  }, /*#__PURE__*/React.createElement(SoftBox, {
    pt: 2,
    px: 2
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h6",
    fontWeight: "medium",
    textTransform: "capitalize"
  }, title)), /*#__PURE__*/React.createElement(SoftBox, {
    p: 2
  }, /*#__PURE__*/React.createElement(SoftBox, {
    component: "ul",
    display: "flex",
    flexDirection: "column",
    p: 0,
    m: 0
  }, renderProfiles)));
}

// Typechecking props for the ProfilesList
ProfilesList.propTypes = {
  title: PropTypes.string.isRequired,
  profiles: PropTypes.arrayOf(PropTypes.object).isRequired
};
export default ProfilesList;