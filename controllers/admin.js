const adminController = {
  login: app.post("/admin/login", (req, res) => {
    console.log(req.body);
    res.json({ method: "post" });
  }),

  signup: app.post("/admin/signup", (req, res) => {
    const { username, password } = req.body;
    console.log(username, password);

    res.json({ msg: "signup successful" });
  }),
};

module.exports = adminController;
