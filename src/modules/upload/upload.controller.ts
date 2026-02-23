import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { UploadService } from './upload.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiResponse } from '@nestjs/swagger';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: '上传文件',
    description: `上传图片或文件到服务器。

**支持的文件格式：**
- 图片：\`jpg\`, \`jpeg\`, \`png\`, \`gif\`, \`webp\`, \`bmp\`
- 其他文件类型可能被拒绝

**限制条件：**
- 单文件大小限制：**500KB**
- Content-Type 必须为 \`multipart/form-data\`
- 表单字段名必须为 \`file\`

**存储路径：**
- 文件存储在 \`/uploads/YYYY-MM-DD/\` 目录下
- 文件名使用随机字符串防止冲突
- 返回的 \`filePath\` 为相对路径，前端需拼接服务器地址使用

**cURL示例：**
\`\`\`bash
curl -X POST http://localhost:5000/api/upload/file \\
  -F "file=@/path/to/image.png"
\`\`\`

**使用场景：**
- 用户头像上传
- 聊天图片消息
- 房间背景图
- 反馈截图`,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '要上传的文件',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '上传成功',
    schema: {
      example: {
        code: 200,
        data: {
          filePath: '/uploads/2026-02-13/abc123.png',
        },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 400, description: '上传失败，文件类型不支持或文件过大' })
  async uploadFile(@UploadedFile() file) {
    return this.uploadService.uploadFile(file);
  }
}
