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

// prop-types is a library for typechecking of props
import PropTypes from "prop-types";

// uuid is a library for generating unique id
import { v4 as uuidv4 } from "uuid";

// @mui material components
import { Table as MuiTable } from "@mui/material";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftAvatar from "components/SoftAvatar";
import SoftTypography from "components/SoftTypography";

// Soft UI Dashboard React base styles
import colors from "assets/theme/base/colors";
import typography from "assets/theme/base/typography";
import borders from "assets/theme/base/borders";
function Table({
  columns,
  rows
}) {
  const {
    light
  } = colors;
  const {
    size,
    fontWeightBold
  } = typography;
  const {
    borderWidth
  } = borders;
  const renderColumns = columns.map(({
    name,
    align,
    width
  }, key) => {
    let pl;
    let pr;
    if (key === 0) {
      pl = 3;
      pr = 3;
    } else if (key === columns.length - 1) {
      pl = 3;
      pr = 3;
    } else {
      pl = 1;
      pr = 1;
    }
    return /*#__PURE__*/React.createElement(SoftBox, {
      key: name,
      component: "th",
      width: width || "auto",
      pt: 1.5,
      pb: 1.25,
      pl: align === "left" ? pl : 3,
      pr: align === "right" ? pr : 3,
      textAlign: align,
      fontSize: size.xxs,
      fontWeight: fontWeightBold,
      color: "secondary",
      opacity: 0.7,
      borderBottom: `${borderWidth[1]} solid ${light.main}`
    }, name.toUpperCase());
  });
  const renderRows = rows.map((row, key) => {
    const rowKey = `row-${key}`;
    const tableRow = columns.map(({
      name,
      align
    }) => {
      let template;
      if (Array.isArray(row[name])) {
        template = /*#__PURE__*/React.createElement(SoftBox, {
          key: uuidv4(),
          component: "td",
          p: 1,
          borderBottom: row.hasBorder ? `${borderWidth[1]} solid ${light.main}` : null
        }, /*#__PURE__*/React.createElement(SoftBox, {
          display: "flex",
          alignItems: "center",
          py: 0.5,
          px: 1
        }, /*#__PURE__*/React.createElement(SoftBox, {
          mr: 2
        }, /*#__PURE__*/React.createElement(SoftAvatar, {
          src: row[name][0],
          name: row[name][1],
          variant: "rounded",
          size: "sm"
        })), /*#__PURE__*/React.createElement(SoftTypography, {
          variant: "button",
          fontWeight: "medium",
          sx: {
            width: "max-content"
          }
        }, row[name][1])));
      } else {
        template = /*#__PURE__*/React.createElement(SoftBox, {
          key: uuidv4(),
          component: "td",
          p: 1,
          textAlign: align,
          borderBottom: row.hasBorder ? `${borderWidth[1]} solid ${light.main}` : null
        }, /*#__PURE__*/React.createElement(SoftTypography, {
          variant: "button",
          fontWeight: "regular",
          color: "secondary",
          sx: {
            display: "inline-block",
            width: "max-content"
          }
        }, row[name]));
      }
      return template;
    });
    return /*#__PURE__*/React.createElement(TableRow, {
      key: rowKey
    }, tableRow);
  });
  return useMemo(() => /*#__PURE__*/React.createElement(TableContainer, null, /*#__PURE__*/React.createElement(MuiTable, null, /*#__PURE__*/React.createElement(SoftBox, {
    component: "thead"
  }, /*#__PURE__*/React.createElement(TableRow, null, renderColumns)), /*#__PURE__*/React.createElement(TableBody, null, renderRows))), [columns, rows]);
}

// Setting default values for the props of Table
Table.defaultProps = {
  columns: [],
  rows: [{}]
};

// Typechecking props for the Table
Table.propTypes = {
  columns: PropTypes.arrayOf(PropTypes.object),
  rows: PropTypes.arrayOf(PropTypes.object)
};
export default Table;