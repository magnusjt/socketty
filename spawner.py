import sys
import pty

args = " ".join(sys.argv[2:])
pty.spawn([sys.argv[1], args])