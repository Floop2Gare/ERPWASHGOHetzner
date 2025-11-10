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
import Icon from "@mui/material/Icon";
import Tooltip from "@mui/material/Tooltip";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftButton from "components/SoftButton";

// Images
import curved1 from "assets/images/curved-images/curved1.jpg";
function MediaPlayer() {
  const mediaPlayerButtonStyles = ({
    functions: {
      pxToRem
    }
  }) => ({
    width: pxToRem(46),
    height: pxToRem(46),
    minWidth: pxToRem(46),
    minHeight: pxToRem(46),
    mr: 1
  });
  return /*#__PURE__*/React.createElement(Card, {
    sx: ({
      functions: {
        linearGradient,
        rgba
      },
      palette: {
        gradients
      }
    }) => ({
      backgroundImage: `${linearGradient(rgba(gradients.dark.main, 0.85), rgba(gradients.dark.state, 0.85))}, url(${curved1})`,
      backgroundSize: "cover",
      backgroundPosition: "center"
    })
  }, /*#__PURE__*/React.createElement(SoftBox, {
    p: 3,
    position: "relative",
    lineHeight: 0
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h5",
    color: "white",
    fontWeight: "medium"
  }, "Some Kind Of Blues"), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    color: "white",
    fontWeight: "regular"
  }, "Deftones"), /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    mt: 6,
    pt: 1
  }, /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }, /*#__PURE__*/React.createElement(Tooltip, {
    title: "Prev",
    placement: "top"
  }, /*#__PURE__*/React.createElement(SoftButton, {
    variant: "outlined",
    size: "large",
    circular: true,
    iconOnly: true,
    sx: mediaPlayerButtonStyles
  }, /*#__PURE__*/React.createElement(Icon, null, "skip_previous"))), /*#__PURE__*/React.createElement(Tooltip, {
    title: "Pause",
    placement: "top"
  }, /*#__PURE__*/React.createElement(SoftButton, {
    variant: "outlined",
    size: "large",
    circular: true,
    iconOnly: true,
    sx: mediaPlayerButtonStyles
  }, /*#__PURE__*/React.createElement(Icon, null, "play_arrow"))), /*#__PURE__*/React.createElement(Tooltip, {
    title: "Next",
    placement: "top"
  }, /*#__PURE__*/React.createElement(SoftButton, {
    variant: "outlined",
    size: "large",
    circular: true,
    iconOnly: true,
    sx: mediaPlayerButtonStyles
  }, /*#__PURE__*/React.createElement(Icon, null, "skip_next")))))));
}
export default MediaPlayer;