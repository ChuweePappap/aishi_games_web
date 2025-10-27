import gzip
import os

# Change to the Build directory
build_dir = r"a:\websites\aishi_games_web\quick-games\brick-smasher\Build"
os.chdir(build_dir)

# Files to decompress
files_to_decompress = [
    "strong.data.gz",
    "strong.framework.js.gz", 
    "strong.wasm.gz"
]

for gz_file in files_to_decompress:
    if os.path.exists(gz_file):
        # Create the output filename by removing .gz extension
        output_file = gz_file[:-3]
        
        print(f"Decompressing {gz_file} to {output_file}...")
        
        try:
            with gzip.open(gz_file, 'rb') as f_in:
                with open(output_file, 'wb') as f_out:
                    f_out.write(f_in.read())
            print(f"Successfully decompressed {gz_file}")
        except Exception as e:
            print(f"Error decompressing {gz_file}: {e}")
    else:
        print(f"File {gz_file} not found")

print("Decompression complete!")