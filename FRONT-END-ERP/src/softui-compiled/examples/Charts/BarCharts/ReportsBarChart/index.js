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
import { Bar } from "react-chartjs-2";

// @mui material components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";

// Soft UI Dashboard React examples
import BarReportsChartItem from "examples/Charts/BarCharts/ReportsBarChart/ReportsBarChartItem";

// ReportsBarChart configurations
import configs from "examples/Charts/BarCharts/ReportsBarChart/configs";
function ReportsBarChart({
  color,
  title,
  description,
  chart,
  items
}) {
  const {
    data,
    options
  } = configs(chart.labels || [], chart.datasets || {});
  const renderItems = items.map(({
    icon,
    label,
    progress
  }) => /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 6,
    sm: 3,
    key: label
  }, /*#__PURE__*/React.createElement(BarReportsChartItem, {
    color: color,
    icon: {
      color: icon.color,
      component: icon.component
    },
    label: label,
    progress: {
      content: progress.content,
      percentage: progress.percentage
    }
  })));
  return /*#__PURE__*/React.createElement(Card, {
    sx: {
      height: "100%"
    }
  }, /*#__PURE__*/React.createElement(SoftBox, {
    padding: "1rem"
  }, useMemo(() => /*#__PURE__*/React.createElement(SoftBox, {
    variant: "gradient",
    bgColor: color,
    borderRadius: "lg",
    py: 2,
    pr: 0.5,
    mb: 3,
    height: "12.5rem"
  }, /*#__PURE__*/React.createElement(Bar, {
    data: data,
    options: options
  })), [chart, color]), /*#__PURE__*/React.createElement(SoftBox, {
    px: 1
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mb: 2
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h6",
    fontWeight: "medium",
    textTransform: "capitalize"
  }, title), /*#__PURE__*/React.createElement(SoftTypography, {
    component: "div",
    variant: "button",
    color: "text",
    fontWeight: "regular"
  }, description)), /*#__PURE__*/React.createElement(SoftBox, {
    py: 1,
    px: 0.5
  }, /*#__PURE__*/React.createElement(Grid, {
    container: true,
    spacing: 2
  }, renderItems)))));
}

// Setting default values for the props of ReportsBarChart
ReportsBarChart.defaultProps = {
  color: "dark",
  description: "",
  items: []
};

// Typechecking props for the ReportsBarChart
ReportsBarChart.propTypes = {
  color: PropTypes.oneOf(["primary", "secondary", "info", "success", "warning", "error", "dark"]),
  title: PropTypes.string.isRequired,
  description: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  chart: PropTypes.objectOf(PropTypes.oneOfType([PropTypes.array, PropTypes.object])).isRequired,
  items: PropTypes.arrayOf(PropTypes.object)
};
export default ReportsBarChart;