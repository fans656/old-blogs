import os


fnames = [f for f in os.listdir('.') if f.endswith('.json')]
fnames = sorted(fnames, reverse=True)
for i, fname in enumerate(fnames):
    os.rename(fname, '{:02}.json'.format(i + 1))
