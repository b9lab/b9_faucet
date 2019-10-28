# To deploy a new version

* `npm run build` to create the built files.
* optional `./dist/serve_as_ipfs.sh` if you want to check how IPFS will serve them.
* `./dist/prepare_files_for_ipfs.js` to copy the required built files for IPFS.
* `./dist/send_files_to_ipfs.js` to send them to your local IPFS.
* you need to pin the hash onto your preferred machine.