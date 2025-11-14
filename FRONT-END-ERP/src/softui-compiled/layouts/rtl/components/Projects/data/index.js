// @mui material components
import Tooltip from "@mui/material/Tooltip";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftAvatar from "components/SoftAvatar";
import SoftProgress from "components/SoftProgress";

// Images
import logoXD from "assets/images/small-logos/logo-xd.svg";
import logoAtlassian from "assets/images/small-logos/logo-atlassian.svg";
import logoSlack from "assets/images/small-logos/logo-slack.svg";
import logoSpotify from "assets/images/small-logos/logo-spotify.svg";
import logoJira from "assets/images/small-logos/logo-jira.svg";
import logoInvesion from "assets/images/small-logos/logo-invision.svg";
import team1 from "assets/images/team-1.jpg";
import team2 from "assets/images/team-2.jpg";
import team3 from "assets/images/team-3.jpg";
import team4 from "assets/images/team-4.jpg";
export default function data() {
  const avatars = members => members.map(([image, name]) => /*#__PURE__*/React.createElement(Tooltip, {
    key: name,
    title: name,
    placeholder: "bottom"
  }, /*#__PURE__*/React.createElement(SoftAvatar, {
    src: image,
    alt: "name",
    size: "xs",
    sx: {
      border: ({
        borders: {
          borderWidth
        },
        palette: {
          white
        }
      }) => `${borderWidth[2]} solid ${white.main}`,
      cursor: "pointer",
      position: "relative",
      "&:not(:first-of-type)": {
        ml: -1.25
      },
      "&:hover, &:focus": {
        zIndex: "10"
      }
    }
  })));
  return {
    columns: [{
      name: "المشروع",
      align: "left"
    }, {
      name: "أعضاء",
      align: "left"
    }, {
      name: "ميزانية",
      align: "center"
    }, {
      name: "إكمال",
      align: "center"
    }],
    rows: [{
      المشروع: [logoXD, "Soft UI XD الإصدار"],
      أعضاء: /*#__PURE__*/React.createElement(SoftBox, {
        display: "flex",
        py: 1
      }, avatars([[team1, "Ryan Tompson"], [team2, "Romina Hadid"], [team3, "Alexander Smith"], [team4, "Jessica Doe"]])),
      ميزانية: /*#__PURE__*/React.createElement(SoftTypography, {
        variant: "caption",
        color: "text",
        fontWeight: "medium"
      }, "$14,000"),
      إكمال: /*#__PURE__*/React.createElement(SoftBox, {
        width: "8rem",
        textAlign: "left"
      }, /*#__PURE__*/React.createElement(SoftProgress, {
        value: 60,
        color: "info",
        variant: "gradient",
        label: false
      }))
    }, {
      المشروع: [logoAtlassian, "أضف مسار التقدم إلى التطبيق الداخلي"],
      أعضاء: /*#__PURE__*/React.createElement(SoftBox, {
        display: "flex",
        py: 1
      }, avatars([[team2, "Romina Hadid"], [team4, "Jessica Doe"]])),
      ميزانية: /*#__PURE__*/React.createElement(SoftTypography, {
        variant: "caption",
        color: "text",
        fontWeight: "medium"
      }, "$3,000"),
      إكمال: /*#__PURE__*/React.createElement(SoftBox, {
        width: "8rem",
        textAlign: "left"
      }, /*#__PURE__*/React.createElement(SoftProgress, {
        value: 10,
        color: "info",
        variant: "gradient",
        label: false
      }))
    }, {
      المشروع: [logoSlack, "إصلاح أخطاء النظام الأساسي"],
      أعضاء: /*#__PURE__*/React.createElement(SoftBox, {
        display: "flex",
        py: 1
      }, avatars([[team1, "Ryan Tompson"], [team3, "Alexander Smith"]])),
      ميزانية: /*#__PURE__*/React.createElement(SoftTypography, {
        variant: "caption",
        color: "text",
        fontWeight: "medium"
      }, "Not set"),
      إكمال: /*#__PURE__*/React.createElement(SoftBox, {
        width: "8rem",
        textAlign: "left"
      }, /*#__PURE__*/React.createElement(SoftProgress, {
        value: 100,
        color: "success",
        variant: "gradient",
        label: false
      }))
    }, {
      المشروع: [logoSpotify, "إطلاق تطبيق الهاتف المحمول الخاص بنا"],
      أعضاء: /*#__PURE__*/React.createElement(SoftBox, {
        display: "flex",
        py: 1
      }, avatars([[team4, "Jessica Doe"], [team3, "Alexander Smith"], [team2, "Romina Hadid"], [team1, "Ryan Tompson"]])),
      ميزانية: /*#__PURE__*/React.createElement(SoftTypography, {
        variant: "caption",
        color: "text",
        fontWeight: "medium"
      }, "$20,500"),
      إكمال: /*#__PURE__*/React.createElement(SoftBox, {
        width: "8rem",
        textAlign: "left"
      }, /*#__PURE__*/React.createElement(SoftProgress, {
        value: 100,
        color: "success",
        variant: "gradient",
        label: false
      }))
    }, {
      المشروع: [logoJira, "أضف صفحة التسعير الجديدة"],
      أعضاء: /*#__PURE__*/React.createElement(SoftBox, {
        display: "flex",
        py: 1
      }, avatars([[team4, "Jessica Doe"]])),
      ميزانية: /*#__PURE__*/React.createElement(SoftTypography, {
        variant: "caption",
        color: "text",
        fontWeight: "medium"
      }, "$500"),
      إكمال: /*#__PURE__*/React.createElement(SoftBox, {
        width: "8rem",
        textAlign: "left"
      }, /*#__PURE__*/React.createElement(SoftProgress, {
        value: 25,
        color: "info",
        variant: "gradient",
        label: false
      }))
    }, {
      المشروع: [logoInvesion, "إعادة تصميم متجر جديد على الإنترنت"],
      أعضاء: /*#__PURE__*/React.createElement(SoftBox, {
        display: "flex",
        py: 1
      }, avatars([[team1, "Ryan Tompson"], [team4, "Jessica Doe"]])),
      ميزانية: /*#__PURE__*/React.createElement(SoftTypography, {
        variant: "caption",
        color: "text",
        fontWeight: "medium"
      }, "$2,000"),
      إكمال: /*#__PURE__*/React.createElement(SoftBox, {
        width: "8rem",
        textAlign: "left"
      }, /*#__PURE__*/React.createElement(SoftProgress, {
        value: 40,
        color: "info",
        variant: "gradient",
        label: false
      }))
    }]
  };
}