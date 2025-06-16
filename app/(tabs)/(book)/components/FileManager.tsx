import * as FileSystem from 'expo-file-system';

const FileManager = {
    booksDirectory: `${FileSystem.documentDirectory}books/`,
  
    async init() {
      const dirInfo = await FileSystem.getInfoAsync(this.booksDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.booksDirectory, { intermediates: true });
      }
    },
  
    getLocalPath(bookUrl: string): string {
      const filename = bookUrl.split('/').pop();
      // Ensure proper encoding of the filename
      const encodedFilename = encodeURIComponent(filename || '');
      return `${this.booksDirectory}${encodedFilename}`;
    },
  
    async checkLocalFile(bookUrl: string): Promise<string | null> {
      const localPath = this.getLocalPath(bookUrl);
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      return fileInfo.exists ? localPath : null;
    },
  
     async isFileCorrupted (filePath: string): Promise<boolean>  {
      try {
        // On Android, we can try to open the file to verify it exists
        // On iOS, we'll just check if it exists
        const fileInfo = await FileSystem.getInfoAsync(filePath);      
        if (!fileInfo.exists) return true;
        
        try {
          // Try to read the first few bytes of the file
          const reader = await FileSystem.readAsStringAsync(filePath, {
            length: 50,  // Read just the first 50 bytes to check if file is readable
            position: 0,
          });
          return !reader; // If we can't read, consider it corrupted
        } catch (readError) {
          console.error('Error reading file:', readError);
          return true; // If we can't read the file, consider it corrupted
        }
      } catch (error) {
        console.error('Error checking file:', error);
        return true;
      }
    },
  
    async checkBook(bookUrl: string): Promise<string>{
      const localPath = await this.checkLocalFile(bookUrl);
      if (localPath !== null){
        if (await this.isFileCorrupted(localPath)) {
          console.log("Removing corrupted file before download");
          await FileSystem.deleteAsync(localPath);
          return this.downloadFile(bookUrl);
        }
        return localPath;
      }
      else{
        return this.downloadFile(bookUrl); 
      }
  
    },
  
    async checkImage(imageUrl: string): Promise<string>{
      const localPath = await this.checkLocalFile(imageUrl);
      if (localPath !== null){      
        return localPath;
      }
      else{
        return this.downloadFile(imageUrl); 
      }
  
    },
  
    async downloadFile(fileUrl: string): Promise<string> {
      const localPath = this.getLocalPath(fileUrl);
      
      try {
        const downloadResumable = FileSystem.createDownloadResumable(
          fileUrl,
          localPath,
          {},
          (downloadProgress) => {
            const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            console.log(`Download progress: ${progress * 100}%`);
          }
        );
    
        const result = await downloadResumable.downloadAsync();
        if (!result) {
          throw new Error('Download failed - no result returned');
        }
        
        if (await this.isFileCorrupted(result.uri)) {
          throw new Error('Downloaded file appears to be corrupted');
        }
  
        return result.uri;
      } catch (error) {
        console.error('Download error:', error);
        throw new Error(`Failed to download`);
      }
    }
  };

export default FileManager;