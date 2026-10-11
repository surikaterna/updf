import { menuForm } from "./menu-form.js";
import { menuFormFixture } from "./menu-form-fixture.js";

for (const width of [32, 24]) {
  const proof = menuForm(menuFormFixture, width);
  console.log(`width=${width}, natural height=${proof.height}\n${proof.body}`);
  console.log(JSON.stringify(proof.boxes));
}
