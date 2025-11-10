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

// @mui material components
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";

// Soft UI Dashboard React examples
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import MiniStatisticsCard from "examples/Cards/StatisticsCards/MiniStatisticsCard";
import ReportsBarChart from "examples/Charts/BarCharts/ReportsBarChart";
import GradientLineChart from "examples/Charts/LineCharts/GradientLineChart";

// Soft UI Dashboard React base styles
import typography from "assets/theme/base/typography";

// Dashboard layout components
import BuildByDevelopers from "layouts/dashboard/components/BuildByDevelopers";
import WorkWithTheRockets from "layouts/dashboard/components/WorkWithTheRockets";
import Projects from "layouts/dashboard/components/Projects";
import OrderOverview from "layouts/dashboard/components/OrderOverview";

// Data
import reportsBarChartData from "layouts/dashboard/data/reportsBarChartData";
import gradientLineChartData from "layouts/dashboard/data/gradientLineChartData";
function Dashboard() {
  const {
    size
  } = typography;
  const {
    chart,
    items
  } = reportsBarChartData;
  return /*#__PURE__*/React.createElement(DashboardLayout, null, /*#__PURE__*/React.createElement(DashboardNavbar, null), /*#__PURE__*/React.createElement(SoftBox, {
    py: 3
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mb: 3
  }, /*#__PURE__*/React.createElement(Grid, {
    container: true,
    spacing: 3
  }, /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    sm: 6,
    xl: 3
  }, /*#__PURE__*/React.createElement(MiniStatisticsCard, {
    title: {
      text: "today's money"
    },
    count: "$53,000",
    percentage: {
      color: "success",
      text: "+55%"
    },
    icon: {
      color: "info",
      component: "paid"
    }
  })), /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    sm: 6,
    xl: 3
  }, /*#__PURE__*/React.createElement(MiniStatisticsCard, {
    title: {
      text: "today's users"
    },
    count: "2,300",
    percentage: {
      color: "success",
      text: "+3%"
    },
    icon: {
      color: "info",
      component: "public"
    }
  })), /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    sm: 6,
    xl: 3
  }, /*#__PURE__*/React.createElement(MiniStatisticsCard, {
    title: {
      text: "new clients"
    },
    count: "+3,462",
    percentage: {
      color: "error",
      text: "-2%"
    },
    icon: {
      color: "info",
      component: "emoji_events"
    }
  })), /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    sm: 6,
    xl: 3
  }, /*#__PURE__*/React.createElement(MiniStatisticsCard, {
    title: {
      text: "sales"
    },
    count: "$103,430",
    percentage: {
      color: "success",
      text: "+5%"
    },
    icon: {
      color: "info",
      component: "shopping_cart"
    }
  })))), /*#__PURE__*/React.createElement(SoftBox, {
    mb: 3
  }, /*#__PURE__*/React.createElement(Grid, {
    container: true,
    spacing: 3
  }, /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    lg: 7
  }, /*#__PURE__*/React.createElement(BuildByDevelopers, null)), /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    lg: 5
  }, /*#__PURE__*/React.createElement(WorkWithTheRockets, null)))), /*#__PURE__*/React.createElement(SoftBox, {
    mb: 3
  }, /*#__PURE__*/React.createElement(Grid, {
    container: true,
    spacing: 3
  }, /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    lg: 5
  }, /*#__PURE__*/React.createElement(ReportsBarChart, {
    title: "active users",
    description: /*#__PURE__*/React.createElement(React.Fragment, null, "(", /*#__PURE__*/React.createElement("strong", null, "+23%"), ") than last week"),
    chart: chart,
    items: items
  })), /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    lg: 7
  }, /*#__PURE__*/React.createElement(GradientLineChart, {
    title: "Sales Overview",
    description: /*#__PURE__*/React.createElement(SoftBox, {
      display: "flex",
      alignItems: "center"
    }, /*#__PURE__*/React.createElement(SoftBox, {
      fontSize: size.lg,
      color: "success",
      mb: 0.3,
      mr: 0.5,
      lineHeight: 0
    }, /*#__PURE__*/React.createElement(Icon, {
      className: "font-bold"
    }, "arrow_upward")), /*#__PURE__*/React.createElement(SoftTypography, {
      variant: "button",
      color: "text",
      fontWeight: "medium"
    }, "4% more", " ", /*#__PURE__*/React.createElement(SoftTypography, {
      variant: "button",
      color: "text",
      fontWeight: "regular"
    }, "in 2021"))),
    height: "20.25rem",
    chart: gradientLineChartData
  })))), /*#__PURE__*/React.createElement(Grid, {
    container: true,
    spacing: 3
  }, /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    md: 6,
    lg: 8
  }, /*#__PURE__*/React.createElement(Projects, null)), /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    md: 6,
    lg: 4
  }, /*#__PURE__*/React.createElement(OrderOverview, null)))), /*#__PURE__*/React.createElement(Footer, null));
}
export default Dashboard;