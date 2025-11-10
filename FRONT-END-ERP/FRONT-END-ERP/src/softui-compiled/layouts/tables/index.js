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
import Card from "@mui/material/Card";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";

// Soft UI Dashboard React examples
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import Table from "examples/Tables/Table";

// Data
import authorsTableData from "layouts/tables/data/authorsTableData";
import projectsTableData from "layouts/tables/data/projectsTableData";
function Tables() {
  const {
    columns,
    rows
  } = authorsTableData;
  const {
    columns: prCols,
    rows: prRows
  } = projectsTableData;
  return /*#__PURE__*/React.createElement(DashboardLayout, null, /*#__PURE__*/React.createElement(DashboardNavbar, null), /*#__PURE__*/React.createElement(SoftBox, {
    py: 3
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mb: 3
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    p: 3
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h6"
  }, "Authors table")), /*#__PURE__*/React.createElement(SoftBox, {
    sx: {
      "& .MuiTableRow-root:not(:last-child)": {
        "& td": {
          borderBottom: ({
            borders: {
              borderWidth,
              borderColor
            }
          }) => `${borderWidth[1]} solid ${borderColor}`
        }
      }
    }
  }, /*#__PURE__*/React.createElement(Table, {
    columns: columns,
    rows: rows
  })))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    p: 3
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h6"
  }, "Projects table")), /*#__PURE__*/React.createElement(SoftBox, {
    sx: {
      "& .MuiTableRow-root:not(:last-child)": {
        "& td": {
          borderBottom: ({
            borders: {
              borderWidth,
              borderColor
            }
          }) => `${borderWidth[1]} solid ${borderColor}`
        }
      }
    }
  }, /*#__PURE__*/React.createElement(Table, {
    columns: prCols,
    rows: prRows
  })))), /*#__PURE__*/React.createElement(Footer, null));
}
export default Tables;