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

import { useMemo } from "react";

// porp-types is a library for typechecking of props
import PropTypes from "prop-types";

// react-chartjs-2 components
import { Pie } from "react-chartjs-2";

// @mui material components
import Card from "@mui/material/Card";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";

// PieChart configurations
import configs from "examples/Charts/PieChart/configs";
function PieChart({
  title,
  description,
  height,
  chart
}) {
  const {
    data,
    options
  } = configs(chart.labels || [], chart.datasets || {});
  const renderChart = /*#__PURE__*/React.createElement(SoftBox, {
    p: 2
  }, title || description ? /*#__PURE__*/React.createElement(SoftBox, {
    px: description ? 1 : 0,
    pt: description ? 1 : 0
  }, title && /*#__PURE__*/React.createElement(SoftBox, {
    mb: 1
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h6"
  }, title)), /*#__PURE__*/React.createElement(SoftBox, {
    mb: 2
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    component: "div",
    variant: "button",
    fontWeight: "regular",
    color: "text"
  }, description))) : null, useMemo(() => /*#__PURE__*/React.createElement(SoftBox, {
    height: height
  }, /*#__PURE__*/React.createElement(Pie, {
    data: data,
    options: options
  })), [chart, height]));
  return title || description ? /*#__PURE__*/React.createElement(Card, null, renderChart) : renderChart;
}

// Setting default values for the props of PieChart
PieChart.defaultProps = {
  title: "",
  description: "",
  height: "19.125rem"
};

// Typechecking props for the PieChart
PieChart.propTypes = {
  title: PropTypes.string,
  description: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  chart: PropTypes.objectOf(PropTypes.oneOfType([PropTypes.array, PropTypes.object])).isRequired
};
export default PieChart;