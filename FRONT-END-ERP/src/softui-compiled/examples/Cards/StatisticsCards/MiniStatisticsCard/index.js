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
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
function MiniStatisticsCard({
  bgColor,
  title,
  count,
  percentage,
  icon,
  direction
}) {
  return /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(SoftBox, {
    bgColor: bgColor,
    variant: "gradient"
  }, /*#__PURE__*/React.createElement(SoftBox, {
    p: 2
  }, /*#__PURE__*/React.createElement(Grid, {
    container: true,
    alignItems: "center"
  }, direction === "left" ? /*#__PURE__*/React.createElement(Grid, {
    item: true
  }, /*#__PURE__*/React.createElement(SoftBox, {
    variant: "gradient",
    bgColor: bgColor === "white" ? icon.color : "white",
    color: bgColor === "white" ? "white" : "dark",
    width: "3rem",
    height: "3rem",
    borderRadius: "md",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    shadow: "md"
  }, /*#__PURE__*/React.createElement(Icon, {
    fontSize: "small",
    color: "inherit"
  }, icon.component))) : null, /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 8
  }, /*#__PURE__*/React.createElement(SoftBox, {
    ml: direction === "left" ? 2 : 0,
    lineHeight: 1
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    color: bgColor === "white" ? "text" : "white",
    opacity: bgColor === "white" ? 1 : 0.7,
    textTransform: "capitalize",
    fontWeight: title.fontWeight
  }, title.text), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h5",
    fontWeight: "bold",
    color: bgColor === "white" ? "dark" : "white"
  }, count, " ", /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    color: percentage.color,
    fontWeight: "bold"
  }, percentage.text)))), direction === "right" ? /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 4
  }, /*#__PURE__*/React.createElement(SoftBox, {
    variant: "gradient",
    bgColor: bgColor === "white" ? icon.color : "white",
    color: bgColor === "white" ? "white" : "dark",
    width: "3rem",
    height: "3rem",
    marginLeft: "auto",
    borderRadius: "md",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    shadow: "md"
  }, /*#__PURE__*/React.createElement(Icon, {
    fontSize: "small",
    color: "inherit"
  }, icon.component))) : null))));
}

// Setting default values for the props of MiniStatisticsCard
MiniStatisticsCard.defaultProps = {
  bgColor: "white",
  title: {
    fontWeight: "medium",
    text: ""
  },
  percentage: {
    color: "success",
    text: ""
  },
  direction: "right"
};

// Typechecking props for the MiniStatisticsCard
MiniStatisticsCard.propTypes = {
  bgColor: PropTypes.oneOf(["white", "primary", "secondary", "info", "success", "warning", "error", "dark"]),
  title: PropTypes.PropTypes.shape({
    fontWeight: PropTypes.oneOf(["light", "regular", "medium", "bold"]),
    text: PropTypes.string
  }),
  count: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  percentage: PropTypes.shape({
    color: PropTypes.oneOf(["primary", "secondary", "info", "success", "warning", "error", "dark", "white"]),
    text: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  }),
  icon: PropTypes.shape({
    color: PropTypes.oneOf(["primary", "secondary", "info", "success", "warning", "error", "dark"]),
    component: PropTypes.node.isRequired
  }).isRequired,
  direction: PropTypes.oneOf(["right", "left"])
};
export default MiniStatisticsCard;