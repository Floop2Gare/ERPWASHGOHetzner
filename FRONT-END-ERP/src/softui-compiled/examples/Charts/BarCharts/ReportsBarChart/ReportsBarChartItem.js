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

// porp-types is a library for typechecking of props
import PropTypes from "prop-types";

// @mui material components
import Icon from "@mui/material/Icon";

// Soft UI Dashboard React base styles
import typography from "assets/theme/base/typography";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftProgress from "components/SoftProgress";
function ReportsBarChartItem({
  color,
  icon,
  label,
  progress
}) {
  const {
    size
  } = typography;
  return /*#__PURE__*/React.createElement(SoftBox, {
    width: "100%"
  }, /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    alignItems: "center",
    mb: 2
  }, /*#__PURE__*/React.createElement(SoftBox, {
    bgColor: icon.color,
    width: "1.25rem",
    height: "1.25rem",
    borderRadius: "sm",
    color: "white",
    fontSize: size.xs,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    shadow: "md",
    mr: 1,
    variant: "gradient"
  }, /*#__PURE__*/React.createElement(Icon, null, icon.component)), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "caption",
    textTransform: "capitalize",
    fontWeight: "medium",
    color: "text"
  }, label)), /*#__PURE__*/React.createElement(SoftBox, {
    mt: 1
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h4",
    fontWeight: "bold",
    color: color
  }, progress.content), /*#__PURE__*/React.createElement(SoftBox, {
    width: "75%",
    mt: 0.5
  }, /*#__PURE__*/React.createElement(SoftProgress, {
    value: progress.percentage,
    color: color
  }))));
}

// Setting default values for the props of ReportsBarChartItem
ReportsBarChartItem.defaultProps = {
  color: "dark"
};

// Typechecking props for the ReportsBarChartItem
ReportsBarChartItem.propTypes = {
  color: PropTypes.oneOf(["primary", "secondary", "info", "success", "warning", "error", "dark"]),
  icon: PropTypes.shape({
    color: PropTypes.oneOf(["primary", "secondary", "info", "success", "warning", "error", "dark"]).isRequired,
    component: PropTypes.node.isRequired
  }).isRequired,
  label: PropTypes.string.isRequired,
  progress: PropTypes.shape({
    content: PropTypes.string.isRequired,
    percentage: PropTypes.number.isRequired
  }).isRequired
};
export default ReportsBarChartItem;