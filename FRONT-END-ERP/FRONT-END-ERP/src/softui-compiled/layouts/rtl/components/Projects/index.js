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

import { useState } from "react";

// @mui material components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";

// Soft UI Dashboard Materail-UI example components
import Table from "examples/Tables/Table";

// Data
import data from "layouts/rtl/components/Projects/data";
function Projects() {
  const {
    columns,
    rows
  } = data();
  const [menu, setMenu] = useState(null);
  const openMenu = ({
    currentTarget
  }) => setMenu(currentTarget);
  const closeMenu = () => setMenu(null);
  const renderMenu = /*#__PURE__*/React.createElement(Menu, {
    id: "simple-menu",
    anchorEl: menu,
    anchorOrigin: {
      vertical: "top",
      horizontal: "left"
    },
    transformOrigin: {
      vertical: "top",
      horizontal: "left"
    },
    open: Boolean(menu),
    onClose: closeMenu
  }, /*#__PURE__*/React.createElement(MenuItem, {
    onClick: closeMenu
  }, "\u0639\u0645\u0644"), /*#__PURE__*/React.createElement(MenuItem, {
    onClick: closeMenu
  }, "\u0639\u0645\u0644 \u0627\u062E\u0631"), /*#__PURE__*/React.createElement(MenuItem, {
    onClick: closeMenu
  }, "\u0634\u064A\u0621 \u0622\u062E\u0631 \u0647\u0646\u0627"));
  return /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    p: 3
  }, /*#__PURE__*/React.createElement(SoftBox, null, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h6",
    gutterBottom: true
  }, "\u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639"), /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    alignItems: "center",
    lineHeight: 0
  }, /*#__PURE__*/React.createElement(Icon, {
    sx: {
      fontWeight: "bold",
      color: ({
        palette: {
          info
        }
      }) => info.main,
      mt: -0.5
    }
  }, "done"), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    fontWeight: "regular",
    color: "text"
  }, "\xA0", /*#__PURE__*/React.createElement("strong", null, "30 \u0627\u0646\u062A\u0647\u0649"), " \u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631"))), /*#__PURE__*/React.createElement(SoftBox, {
    color: "text",
    px: 2
  }, /*#__PURE__*/React.createElement(Icon, {
    sx: {
      cursor: "pointer",
      fontWeight: "bold"
    },
    fontSize: "small",
    onClick: openMenu
  }, "more_vert")), renderMenu), /*#__PURE__*/React.createElement(SoftBox, {
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
  })));
}
export default Projects;