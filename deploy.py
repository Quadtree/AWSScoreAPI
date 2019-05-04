#!/usr/bin/env python3

import zipfile
import os
import subprocess

with zipfile.ZipFile('/tmp/new-version.zip', 'w') as z:
    z.write(os.path.join(os.path.dirname(os.path.realpath(__file__)), 'index.js'), 'index.js')

subprocess.run(['aws', '--region=us-east-1', 'lambda', 'update-function-code', '--zip-file=fileb:///tmp/new-version.zip', '--function-name=recordScore'])