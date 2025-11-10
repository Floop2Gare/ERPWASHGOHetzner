/* eslint-disable react/prop-types */
// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftAvatar from "components/SoftAvatar";
import SoftBadge from "components/SoftBadge";

// Images
import team2 from "assets/images/team-2.jpg";
import team3 from "assets/images/team-3.jpg";
import team4 from "assets/images/team-4.jpg";
function Author({
  image,
  name,
  email
}) {
  return /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    alignItems: "center",
    px: 1,
    py: 0.5
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mr: 2
  }, /*#__PURE__*/React.createElement(SoftAvatar, {
    src: image,
    alt: name,
    size: "sm",
    variant: "rounded"
  })), /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    flexDirection: "column"
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    fontWeight: "medium"
  }, name), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "caption",
    color: "secondary"
  }, email)));
}
function Function({
  job,
  org
}) {
  return /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    flexDirection: "column"
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "caption",
    fontWeight: "medium",
    color: "text"
  }, job), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "caption",
    color: "secondary"
  }, org));
}
const authorsTableData = {
  columns: [{
    name: "author",
    align: "left"
  }, {
    name: "function",
    align: "left"
  }, {
    name: "status",
    align: "center"
  }, {
    name: "employed",
    align: "center"
  }, {
    name: "action",
    align: "center"
  }],
  rows: [{
    author: /*#__PURE__*/React.createElement(Author, {
      image: team2,
      name: "John Michael",
      email: "john@creative-tim.com"
    }),
    function: /*#__PURE__*/React.createElement(Function, {
      job: "Manager",
      org: "Organization"
    }),
    status: /*#__PURE__*/React.createElement(SoftBadge, {
      variant: "gradient",
      badgeContent: "online",
      color: "success",
      size: "xs",
      container: true
    }),
    employed: /*#__PURE__*/React.createElement(SoftTypography, {
      variant: "caption",
      color: "secondary",
      fontWeight: "medium"
    }, "23/04/18"),
    action: /*#__PURE__*/React.createElement(SoftTypography, {
      component: "a",
      href: "#",
      variant: "caption",
      color: "secondary",
      fontWeight: "medium"
    }, "Edit")
  }, {
    author: /*#__PURE__*/React.createElement(Author, {
      image: team3,
      name: "Alexa Liras",
      email: "alexa@creative-tim.com"
    }),
    function: /*#__PURE__*/React.createElement(Function, {
      job: "Programator",
      org: "Developer"
    }),
    status: /*#__PURE__*/React.createElement(SoftBadge, {
      variant: "gradient",
      badgeContent: "offline",
      color: "secondary",
      size: "xs",
      container: true
    }),
    employed: /*#__PURE__*/React.createElement(SoftTypography, {
      variant: "caption",
      color: "secondary",
      fontWeight: "medium"
    }, "11/01/19"),
    action: /*#__PURE__*/React.createElement(SoftTypography, {
      component: "a",
      href: "#",
      variant: "caption",
      color: "secondary",
      fontWeight: "medium"
    }, "Edit")
  }, {
    author: /*#__PURE__*/React.createElement(Author, {
      image: team4,
      name: "Laurent Perrier",
      email: "laurent@creative-tim.com"
    }),
    function: /*#__PURE__*/React.createElement(Function, {
      job: "Executive",
      org: "Projects"
    }),
    status: /*#__PURE__*/React.createElement(SoftBadge, {
      variant: "gradient",
      badgeContent: "online",
      color: "success",
      size: "xs",
      container: true
    }),
    employed: /*#__PURE__*/React.createElement(SoftTypography, {
      variant: "caption",
      color: "secondary",
      fontWeight: "medium"
    }, "19/09/17"),
    action: /*#__PURE__*/React.createElement(SoftTypography, {
      component: "a",
      href: "#",
      variant: "caption",
      color: "secondary",
      fontWeight: "medium"
    }, "Edit")
  }, {
    author: /*#__PURE__*/React.createElement(Author, {
      image: team3,
      name: "Michael Levi",
      email: "michael@creative-tim.com"
    }),
    function: /*#__PURE__*/React.createElement(Function, {
      job: "Programator",
      org: "Developer"
    }),
    status: /*#__PURE__*/React.createElement(SoftBadge, {
      variant: "gradient",
      badgeContent: "online",
      color: "success",
      size: "xs",
      container: true
    }),
    employed: /*#__PURE__*/React.createElement(SoftTypography, {
      variant: "caption",
      color: "secondary",
      fontWeight: "medium"
    }, "24/12/08"),
    action: /*#__PURE__*/React.createElement(SoftTypography, {
      component: "a",
      href: "#",
      variant: "caption",
      color: "secondary",
      fontWeight: "medium"
    }, "Edit")
  }, {
    author: /*#__PURE__*/React.createElement(Author, {
      image: team2,
      name: "Richard Gran",
      email: "richard@creative-tim.com"
    }),
    function: /*#__PURE__*/React.createElement(Function, {
      job: "Manager",
      org: "Executive"
    }),
    status: /*#__PURE__*/React.createElement(SoftBadge, {
      variant: "gradient",
      badgeContent: "offline",
      color: "secondary",
      size: "xs",
      container: true
    }),
    employed: /*#__PURE__*/React.createElement(SoftTypography, {
      variant: "caption",
      color: "secondary",
      fontWeight: "medium"
    }, "04/10/21"),
    action: /*#__PURE__*/React.createElement(SoftTypography, {
      component: "a",
      href: "#",
      variant: "caption",
      color: "secondary",
      fontWeight: "medium"
    }, "Edit")
  }, {
    author: /*#__PURE__*/React.createElement(Author, {
      image: team4,
      name: "Miriam Eric",
      email: "miriam@creative-tim.com"
    }),
    function: /*#__PURE__*/React.createElement(Function, {
      job: "Programtor",
      org: "Developer"
    }),
    status: /*#__PURE__*/React.createElement(SoftBadge, {
      variant: "gradient",
      badgeContent: "offline",
      color: "secondary",
      size: "xs",
      container: true
    }),
    employed: /*#__PURE__*/React.createElement(SoftTypography, {
      variant: "caption",
      color: "secondary",
      fontWeight: "medium"
    }, "14/09/20"),
    action: /*#__PURE__*/React.createElement(SoftTypography, {
      component: "a",
      href: "#",
      variant: "caption",
      color: "secondary",
      fontWeight: "medium"
    }, "Edit")
  }]
};
export default authorsTableData;