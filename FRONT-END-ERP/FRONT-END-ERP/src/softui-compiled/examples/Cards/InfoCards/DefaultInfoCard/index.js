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

// prop-types is library for typechecking of props
import PropTypes from "prop-types";

// @mui material components
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Icon from "@mui/material/Icon";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
function DefaultInfoCard({
  color,
  icon,
  title,
  description,
  value
}) {
  return /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(SoftBox, {
    p: 2,
    mx: 3,
    display: "flex",
    justifyContent: "center"
  }, /*#__PURE__*/React.createElement(SoftBox, {
    display: "grid",
    justifyContent: "center",
    alignItems: "center",
    bgColor: color,
    color: "white",
    width: "4rem",
    height: "4rem",
    shadow: "md",
    borderRadius: "lg",
    variant: "gradient"
  }, /*#__PURE__*/React.createElement(Icon, {
    fontSize: "default"
  }, icon))), /*#__PURE__*/React.createElement(SoftBox, {
    pb: 2,
    px: 2,
    textAlign: "center",
    lineHeight: 1.25
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h6",
    fontWeight: "medium",
    textTransform: "capitalize"
  }, title), description && /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "caption",
    color: "text",
    fontWeight: "regular"
  }, description), description && !value ? null : /*#__PURE__*/React.createElement(Divider, null), value && /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h5",
    fontWeight: "medium"
  }, value)));
}

// Setting default values for the props of DefaultInfoCard
DefaultInfoCard.defaultProps = {
  color: "info",
  value: "",
  description: ""
};

// Typechecking props for the DefaultInfoCard
DefaultInfoCard.propTypes = {
  color: PropTypes.oneOf(["primary", "secondary", "info", "success", "warning", "error", "dark"]),
  icon: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};
export default DefaultInfoCard;