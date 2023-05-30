#!/usr/bin/env python3
""" update_file_timestamps.py

    Update file and directory modification timestamps so that golang properly
    caches test inputs.

    Go uses a combination of the size and modification time, so if a repo is
    re-cloned and we don't do something like this, then it considers all files to
    be new and won't cache any tests that read fixtures from the repo.

    See https://github.com/golang/go/blob/db22489012aabdd853d09d33e7525788d0acf2c4/src/cmd/go/internal/test/test.go#L1783
    for the associated code in the golang test tooling.
"""

import hashlib
import logging
import os
import os.path
import sys

logging.basicConfig(
    format='%(asctime)s [%(levelname)s]: %(message)s',
    level=logging.INFO,
)

BUF_SIZE = 65536

# Roughly May 15, 2023 in epoch time
BASE_DATE = 1684178360


def main():
    if len(sys.argv) != 2:
        raise Exception('Usage: update_file_timestamps.py [repo root]')

    repo_root = sys.argv[1]

    all_dirs = []

    for root, dirs, files in os.walk(repo_root):
        for file_name in files:
            full_path = os.path.join(root, file_name)
            rel_path = os.path.relpath(full_path, repo_root)

            if rel_path.startswith('.'):
                continue

            sha1 = hashlib.sha1()
            with open(full_path, 'rb') as file:
                data = file.read(65536)
                sha1.update(data)

            # Update modified date based on contents of file so we
            # can bust the cache when file contents change (even if the total
            # size doesn't).
            mod_date = BASE_DATE - (int.from_bytes(sha1.digest()[0:5], 'big') %
                                    10000)

            logging.info(
                f'Setting modified time of file {rel_path} to {mod_date}')
            os.utime(full_path, (mod_date, mod_date))

        for dir_name in dirs:
            full_path = os.path.join(root, dir_name)
            rel_path = os.path.relpath(full_path, repo_root)

            if rel_path.startswith('.'):
                continue

            all_dirs.append((full_path, rel_path))

    # Update directories after the files are modified, otherwise the directory
    # modification times will be altered by the file modifications.

    # Start from the leaves and go up.
    all_dirs.sort(key=lambda d: (-len(d[0]), d[0]))

    for dir_full_path, dir_rel_path in all_dirs:
        # Go already checks the contents of each file in the directory, so
        # that should be sufficient for busting the cache if something in
        # the directory changes; there's no need to also include a hash in
        # the modified time.
        logging.info(
            f'Setting modified time of directory {dir_rel_path} to {BASE_DATE}'
        )
        os.utime(dir_full_path, (BASE_DATE, BASE_DATE))

    logging.info('Done')


if __name__ == '__main__':
    main()
