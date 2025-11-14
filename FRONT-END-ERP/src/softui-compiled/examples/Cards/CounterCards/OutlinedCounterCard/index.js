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

// react-countup components
import CountUp from "react-countup";

// prop-types is a library for typechecking of props
import PropTypes from "prop-types";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";

// Soft UI Dashboard React base styles
import colors from "assets/theme/base/colors";
import borders from "assets/theme/base/borders";
function OutlinedCounterCard({
  color,
  count,
  title,
  prefix,
  suffix
}) {
  const {
    secondary
  } = colors;
  const {
    borderWidth
  } = borders;
  return /*#__PURE__*/React.createElement(SoftBox, {
    borderRadius: "md",
    border: `${borderWidth[1]} dashed ${secondary.main}`,
    textAlign: "center",
    py: 2
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h6",
    color: color,
    fontWeight: "medium",
    textTransform: "capitalize"
  }, title), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h4",
    fontWeight: "bold"
  }, prefix && /*#__PURE__*/React.createElement(SoftTypography, {
    component: "span",
    variant: "h5",
    fontWeight: "bold"
  }, prefix), /*#__PURE__*/React.createElement(SoftBox, {
    display: "inline-block",
    mx: 0.5
  }, /*#__PURE__*/React.createElement(CountUp, {
    end: count,
    duration: 1,
    separator: ","
  })), suffix && /*#__PURE__*/React.createElement(SoftTypography, {
    component: "span",
    variant: "h5",
    fontWeight: "bold"
  }, suffix)));
}

// Setting default values for the props of OutlinedCounterCard
OutlinedCounterCard.defaultProps = {
  color: "info",
  prefix: "",
  suffix: ""
};

// Typechecking props for the BlogCard
OutlinedCounterCard.propTypes = {
  color: PropTypes.oneOf(["primary", "secondary", "info", "success", "warning", "error", "dark"]),
  count: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  title: PropTypes.string.isRequired,
  prefix: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  suffix: PropTypes.oneOfType([PropTypes.string, PropTypes.node])
};
export default OutlinedCounterCard;