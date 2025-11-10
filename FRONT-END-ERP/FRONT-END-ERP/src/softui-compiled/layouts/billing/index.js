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

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";

// Soft UI Dashboard React components
import MasterCard from "examples/Cards/MasterCard";
import DefaultInfoCard from "examples/Cards/InfoCards/DefaultInfoCard";

// Soft UI Dashboard React examples
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Billing page components
import PaymentMethod from "layouts/billing/components/PaymentMethod";
import Invoices from "layouts/billing/components/Invoices";
import BillingInformation from "layouts/billing/components/BillingInformation";
import Transactions from "layouts/billing/components/Transactions";
function Billing() {
  return /*#__PURE__*/React.createElement(DashboardLayout, null, /*#__PURE__*/React.createElement(DashboardNavbar, null), /*#__PURE__*/React.createElement(SoftBox, {
    mt: 4
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mb: 1.5
  }, /*#__PURE__*/React.createElement(Grid, {
    container: true,
    spacing: 3
  }, /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    lg: 8
  }, /*#__PURE__*/React.createElement(Grid, {
    container: true,
    spacing: 3
  }, /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    xl: 6
  }, /*#__PURE__*/React.createElement(MasterCard, {
    number: 4562112245947852,
    holder: "jack peterson",
    expires: "11/22"
  })), /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    md: 6,
    xl: 3
  }, /*#__PURE__*/React.createElement(DefaultInfoCard, {
    icon: "account_balance",
    title: "salary",
    description: "Belong Interactive",
    value: "+$2000"
  })), /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    md: 6,
    xl: 3
  }, /*#__PURE__*/React.createElement(DefaultInfoCard, {
    icon: "paypal",
    title: "paypal",
    description: "Freelance Payment",
    value: "$455.00"
  })), /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12
  }, /*#__PURE__*/React.createElement(PaymentMethod, null)))), /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    lg: 4
  }, /*#__PURE__*/React.createElement(Invoices, null)))), /*#__PURE__*/React.createElement(SoftBox, {
    my: 3
  }, /*#__PURE__*/React.createElement(Grid, {
    container: true,
    spacing: 3
  }, /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    md: 7
  }, /*#__PURE__*/React.createElement(BillingInformation, null)), /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    md: 5
  }, /*#__PURE__*/React.createElement(Transactions, null))))), /*#__PURE__*/React.createElement(Footer, null));
}
export default Billing;