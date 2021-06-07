const User = require("../model/user");

module.exports = async (encryptedPassword, name, email) => {
  try {
    const data = new User({
      name: name,
      password: encryptedPassword,
      email: email,
    });

    const result = await data.save();
    console.log(result);
    return true;
  } catch (err) {
    return false;
  }
};
