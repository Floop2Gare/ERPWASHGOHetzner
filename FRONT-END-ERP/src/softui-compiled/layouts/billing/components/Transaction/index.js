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

// prop-types is a library for typechecking of props
import PropTypes from "prop-types";

// @mui material components
import Icon from "@mui/material/Icon";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftButton from "components/SoftButton";
function Transaction({
  color,
  icon,
  name,
  description,
  value
}) {
  return /*#__PURE__*/React.createElement(SoftBox, {
    key: name,
    component: "li",
    py: 1,
    pr: 2,
    mb: 1
  }, /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  }, /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    alignItems: "center"
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mr: 2
  }, /*#__PURE__*/React.createElement(SoftButton, {
    variant: "outlined",
    color: color,
    size: "small",
    iconOnly: true,
    circular: true
  }, /*#__PURE__*/React.createElement(Icon, {
    sx: {
      fontWeight: "bold"
    }
  }, icon))), /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    flexDirection: "column"
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    fontWeight: "medium",
    gutterBottom: true
  }, name), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "caption",
    color: "text"
  }, description))), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    color: color,
    fontWeight: "medium",
    textGradient: true
  }, value)));
}

// Typechecking props of the Transaction
Transaction.propTypes = {
  color: PropTypes.oneOf(["primary", "secondary", "info", "success", "warning", "error", "light", "dark"]).isRequired,
  icon: PropTypes.node.isRequired,
  name: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired
};
export default Transaction;