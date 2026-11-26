#!/usr/bin/env bash
# Model-check every config. Picker must hold; Control (the code before the fix)
# and the Reach* probes must be violated.
set -uo pipefail
cd "$(dirname "$0")" || exit
status=0
for cfg in *.cfg; do
	name=${cfg%.cfg}
	out=$(nix-shell -p tlaplus --run "tlc -workers auto -cleanup -config $cfg Picker.tla" 2>&1)
	if grep -q "No error has been found" <<<"$out"; then result=holds; else result=violated; fi
	if [[ $name == Picker ]]; then want=holds; else want=violated; fi
	states=$(grep -o '[0-9]* distinct states found' <<<"$out" | tail -1)
	echo "$name: $result ($states)"
	[[ $result == "$want" ]] || status=1
done
rm -rf states ./*_TTrace_* 2>/dev/null
exit "$status"
